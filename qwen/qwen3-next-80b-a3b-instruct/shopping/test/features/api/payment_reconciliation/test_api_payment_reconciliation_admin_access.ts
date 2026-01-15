import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentReconciliation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentReconciliation";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentReconciliation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentReconciliation";
import type { IShoppingMallPaymentReconciliationDetails } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentReconciliationDetails";
import type { IShoppingMallPaymentReconciliationMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentReconciliationMetadata";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_reconciliation_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // Step 2: Use adminConnection for all subsequent API calls (don't use base connection)
  // Step 3: Call the reconciliation analytics endpoint
  const reconciliationData =
    await api.functional.shoppingMall.admin.analytics.payments.reconciliation.index(
      adminConnection,
    );
  typia.assert(reconciliationData);
  // Step 4: Validate pagination structure matches the schema
  TestValidator.equals(
    "current page is at least 1",
    reconciliationData.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "limit is positive",
    reconciliationData.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "records is non-negative",
    reconciliationData.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pages is non-negative",
    reconciliationData.pagination.pages >= 0,
    true,
  );
  // Step 5: Validate data array exists and is properly structured
  TestValidator.predicate(
    "data array is present",
    Array.isArray(reconciliationData.data),
  );
  // Step 6: Validate there is at least one reconciliation record (system should have created some)
  TestValidator.predicate(
    "at least one reconciliation record exists",
    reconciliationData.data.length > 0,
  );
  // Step 7: Validate reconciliation record structure using the IShoppingMallPaymentReconciliation type
  // No individual property validation needed - typia.assert(reconciliationData) already confirmed types
  // Now validate business logic
  const firstRecord = reconciliationData.data[0];
  // Validate the status is one of the valid enum values
  TestValidator.predicate(
    "status is valid",
    ["successful", "failed", "pending", "manual_review"].includes(
      firstRecord.status,
    ),
  );
  // Validate that the sum of all transaction categories matches the total
  const sumOfTransactions =
    firstRecord.matched_transactions +
    firstRecord.mismatched_transactions +
    firstRecord.pending_transactions;
  TestValidator.equals(
    "sum of transaction categories equals total",
    sumOfTransactions,
    firstRecord.total_transactions,
  );
  // Validate that financial amounts are not negative
  TestValidator.predicate(
    "total_reconciled_amount is not negative",
    firstRecord.total_reconciled_amount >= 0,
  );
  TestValidator.predicate(
    "total_discrepancy_amount is not negative",
    firstRecord.total_discrepancy_amount >= 0,
  );
  // Validate that start_date is before end_date
  TestValidator.predicate(
    "start_date is before end_date",
    new Date(firstRecord.start_date) < new Date(firstRecord.end_date),
  );
  // Validate reconciliation_metadata if present
  if (firstRecord.reconciliation_metadata) {
    TestValidator.equals(
      "reconciliation_metadata.status is valid",
      ["pending", "in_progress", "completed", "failed"].includes(
        firstRecord.reconciliation_metadata.status,
      ),
      true,
    );
    TestValidator.equals(
      "reconciliation_metadata.summary is a string",
      typeof firstRecord.reconciliation_metadata.summary === "string",
      true,
    );
    TestValidator.equals(
      "reconciliation_metadata.startTime is ISO format",
      typeof firstRecord.reconciliation_metadata.startTime === "string",
      true,
    );
    // Validate processedCount and failedCount are non-negative
    TestValidator.predicate(
      "reconciliation_metadata.processedCount is non-negative",
      firstRecord.reconciliation_metadata.processedCount >= 0,
    );
    TestValidator.predicate(
      "reconciliation_metadata.failedCount is non-negative",
      firstRecord.reconciliation_metadata.failedCount >= 0,
    );
    // Validate endTime is present if status is completed or failed
    if (
      firstRecord.reconciliation_metadata.status === "completed" ||
      firstRecord.reconciliation_metadata.status === "failed"
    ) {
      TestValidator.equals(
        "endTime is defined when status is completed or failed",
        firstRecord.reconciliation_metadata.endTime !== undefined,
        true,
      );
    }
  }
}
