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
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_reconciliation_audit(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@wrtn.io`,
      password: RandomGenerator.alphaNumeric(16),
      href: `https://example.com/admin/join-${RandomGenerator.alphaNumeric(6)}`,
      referrer: `https://example.com/admin/signup-${RandomGenerator.alphaNumeric(6)}`,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Generate reconciliation request with date range
  const now = new Date();
  const end_date = now.toISOString();
  const start_date = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const request: IShoppingMallPaymentReconciliation.IRequest = {
    start_date,
    end_date,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallPaymentReconciliation.IRequest;
  // Step 3: Fetch reconciliation records
  const result: IPageIShoppingMallPaymentReconciliation.ISummary =
    await api.functional.shoppingMall.admin.payment_reconciliation.index(
      adminConnection,
      { body: request },
    );
  typia.assert(result);
  // Step 4: Validate pagination
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records >= 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    result.pagination.pages >= 1,
  );
  // Step 5: Validate data array structure
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  TestValidator.predicate("data array has items", result.data.length > 0);
  // Step 6: Validate business logic in each reconciliation record (typia.assert() handles all type validation)
  for (const record of result.data) {
    TestValidator.predicate(
      "total_reconciled_amount >= 0",
      record.total_reconciled_amount >= 0,
    );
    TestValidator.predicate(
      "total_failed_reconciliations >= 0",
      record.total_failed_reconciliations >= 0,
    );
    TestValidator.predicate(
      "total_processed_payments >= 0",
      record.total_processed_payments >= 0,
    );
    TestValidator.predicate(
      "successful_reconciliation_rate between 0-100",
      record.successful_reconciliation_rate >= 0 &&
        record.successful_reconciliation_rate <= 100,
    );
    TestValidator.predicate(
      "average_processing_time_ms >= 0",
      record.average_processing_time_ms >= 0,
    );
    TestValidator.predicate(
      "payment_method_count >= 0",
      record.payment_method_count >= 0,
    );
    TestValidator.predicate("merchant_count >= 0", record.merchant_count >= 0);
    TestValidator.predicate(
      "payment_gateway_count >= 0",
      record.payment_gateway_count >= 0,
    );
  }
}
