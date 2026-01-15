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
export async function test_api_payment_reconciliation_status_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Get reconciliation records
  const response: IPageIShoppingMallPaymentReconciliation =
    await api.functional.shoppingMall.admin.analytics.payments.reconciliation.index(
      adminConnection,
    );
  typia.assert(response);
  // Step 3: Validate pagination
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Step 4: Validate that all reconciliation records have valid statuses
  // Check we have at least one record
  TestValidator.predicate(
    "at least one reconciliation record exists",
    response.data.length > 0,
  );
  // Validate each record's status is one of the allowed values
  const validStatuses: IShoppingMallPaymentReconciliation["status"][] = [
    "successful",
    "failed",
    "pending",
    "manual_review",
  ];
  response.data.forEach((reconciliation) => {
    TestValidator.predicate(
      "reconciliation status is one of the allowed values",
      validStatuses.includes(reconciliation.status),
    );
  });
  // Step 5: Validate the structure of each reconciliation record
  // Each record should have all required fields
  response.data.forEach((reconciliation) => {
    TestValidator.equals(
      "reconciliation has valid UUID id",
      typeof reconciliation.id,
      "string",
    );
    TestValidator.equals(
      "reconciliation has valid date-time start_date",
      typeof reconciliation.start_date,
      "string",
    );
    TestValidator.equals(
      "reconciliation has valid date-time end_date",
      typeof reconciliation.end_date,
      "string",
    );
    TestValidator.predicate(
      "reconciliation has non-negative total_transactions",
      reconciliation.total_transactions >= 0,
    );
    TestValidator.predicate(
      "reconciliation has non-negative matched_transactions",
      reconciliation.matched_transactions >= 0,
    );
    TestValidator.predicate(
      "reconciliation has non-negative mismatched_transactions",
      reconciliation.mismatched_transactions >= 0,
    );
    TestValidator.predicate(
      "reconciliation has non-negative pending_transactions",
      reconciliation.pending_transactions >= 0,
    );
    TestValidator.predicate(
      "reconciliation has non-negative total_reconciled_amount",
      reconciliation.total_reconciled_amount >= 0,
    );
    TestValidator.predicate(
      "reconciliation has non-negative total_discrepancy_amount",
      reconciliation.total_discrepancy_amount >= 0,
    );
    TestValidator.equals(
      "reconciliation has valid date-time created_at",
      typeof reconciliation.created_at,
      "string",
    );
    TestValidator.equals(
      "reconciliation has valid date-time updated_at",
      typeof reconciliation.updated_at,
      "string",
    );
    // Note: processed_by and reconciliation_metadata are optional
    if (reconciliation.processed_by !== undefined) {
      TestValidator.equals(
        "reconciliation processed_by is string",
        typeof reconciliation.processed_by,
        "string",
      );
    }
    if (reconciliation.reconciliation_metadata !== undefined) {
      TestValidator.equals(
        "reconciliation_metadata reconciliationId is string",
        typeof reconciliation.reconciliation_metadata.reconciliationId,
        "string",
      );
      TestValidator.equals(
        "reconciliation_metadata status is valid",
        ["pending", "in_progress", "completed", "failed"].includes(
          reconciliation.reconciliation_metadata.status,
        ),
        true,
      );
      TestValidator.equals(
        "reconciliation_metadata startTime is date-time",
        typeof reconciliation.reconciliation_metadata.startTime,
        "string",
      );
      if (reconciliation.reconciliation_metadata.endTime !== undefined) {
        TestValidator.equals(
          "reconciliation_metadata endTime is date-time",
          typeof reconciliation.reconciliation_metadata.endTime,
          "string",
        );
      }
      TestValidator.predicate(
        "reconciliation_metadata processedCount is non-negative",
        reconciliation.reconciliation_metadata.processedCount >= 0,
      );
      TestValidator.predicate(
        "reconciliation_metadata failedCount is non-negative",
        reconciliation.reconciliation_metadata.failedCount >= 0,
      );
      TestValidator.equals(
        "reconciliation_metadata summary is string",
        typeof reconciliation.reconciliation_metadata.summary,
        "string",
      );
      // details is optional and is a string
      if (reconciliation.reconciliation_metadata.details !== undefined) {
        TestValidator.equals(
          "reconciliation_metadata details is string",
          typeof reconciliation.reconciliation_metadata.details,
          "string",
        );
      }
    }
  });
}
