import org.springframework.stereotype.Service;

public record TransactionRecord(String id, double amount, String currency) {}

@Service
public class InvariantValidator {
    public boolean validate(TransactionRecord record) {
        if (record.id() == null || record.id().isBlank()) return false;
        if (record.amount() <= 0.0) return false;
        if (!record.currency().matches("^[A-Z]{3}$")) return false;
        return true;
    }
}
