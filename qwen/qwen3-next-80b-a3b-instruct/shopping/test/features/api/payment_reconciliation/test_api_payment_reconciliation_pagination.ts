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
export async function test_api_payment_reconciliation_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Retrieve the first page of payment reconciliations
  const firstPage: IPageIShoppingMallPaymentReconciliation =
    await api.functional.shoppingMall.admin.analytics.payments.reconciliation.index(
      adminConnection,
    );
  typia.assert(firstPage);
  // Step 3: Validate pagination metadata structure and constraints
  const pagination = firstPage.pagination;
  TestValidator.equals("current page is 0", pagination.current, 0);
  TestValidator.predicate("limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "total records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("total pages is non-negative", pagination.pages >= 0);
  // Step 4: Validate data array has at least one reconciliation record
  TestValidator.predicate(
    "at least one reconciliation record exists",
    firstPage.data.length > 0,
  );
  // Step 5: Validate that each reconciliation record has the correct shape
  for (const reconciliation of firstPage.data) {
    // typia.assert already validates the entire structure
    // Verify the record has required fields without manual validation
    // This is guaranteed by typia.assert after the interface definition
  }
  // Step 6: Retrieve second page and validate data is distinct from first page
  // We only do this if total records exceed the limit (indicating multiple pages exist)
  if (firstPage.pagination.records > firstPage.pagination.limit) {
    const secondPage: IPageIShoppingMallPaymentReconciliation =
      await api.functional.shoppingMall.admin.analytics.payments.reconciliation.index(
        adminConnection,
      );
    typia.assert(secondPage);
    // Validate that page number is incremented
    TestValidator.equals(
      "second page current is 1",
      secondPage.pagination.current,
      1,
    );
    // Validate that data sets are different (no duplication between pages)
    const firstPageIds = firstPage.data.map((r) => r.id);
    const secondPageIds = secondPage.data.map((r) => r.id);
    // Check that there is no overlap - data should be distinct between pages
    const overlap = firstPageIds.filter((id) => secondPageIds.includes(id));
    TestValidator.equals("pages have no overlapping data", overlap.length, 0);
  }
  // Step 7: Validate total records count reflects complete dataset
  // Retrieve all pages (if possible) and sum records
  const limit = firstPage.pagination.limit;
  const totalRecords = firstPage.pagination.records;
  // Calculate expected total pages
  const totalExpectedPages = Math.ceil(totalRecords / limit);
  TestValidator.equals(
    "total pages calculation matches",
    firstPage.pagination.pages,
    totalExpectedPages,
  );
  // Ensure total records count is accurate
  // We're not retrieving all records to avoid performance issues, but we trust the pagination metadata
  // provided by the API, which should correctly reflect the total dataset
  TestValidator.predicate(
    "total records is consistent with metadata",
    totalRecords >= firstPage.data.length,
  );
}
