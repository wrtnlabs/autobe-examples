import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentDispute";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentDispute";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_dispute_list_filtered_by_dispute_reason_and_pagination(
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
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create multiple dispute records with different disputeReasons
  // Get a known dispute reason keyword for filtering
  const searchKeyword = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  }).toLowerCase();
  // We assume 5 dispute records already exist in the system
  // We'll manually construct a known dataset with 3 containing the search keyword in comments
  // Only field available for search is 'comments' (admin notes)
  // Customer dispute description is not exposed in the response
  const disputesArray = [
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      payment_id: typia.random<string & tags.Format<"uuid">>(),
      customer_id: typia.random<string & tags.Format<"uuid">>(),
      dispute_type: "product_issue",
      status: "open",
      resolution_status: "pending",
      amount: 150.99,
      disputed_at: "2026-01-10T08:00:00Z",
      comments: `Admin notes: ${searchKeyword} occurred post delivery`,
    },
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      payment_id: typia.random<string & tags.Format<"uuid">>(),
      customer_id: typia.random<string & tags.Format<"uuid">>(),
      dispute_type: "fraud",
      status: "under_review",
      resolution_status: "pending",
      amount: 89.5,
      disputed_at: "2026-01-09T08:00:00Z",
      comments: `Admin notes: ${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 })}`,
    },
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      payment_id: typia.random<string & tags.Format<"uuid">>(),
      customer_id: typia.random<string & tags.Format<"uuid">>(),
      dispute_type: "service_issue",
      status: "open",
      resolution_status: "approved",
      amount: 45.25,
      disputed_at: "2026-01-08T08:00:00Z",
      comments: `Customer reported: ${searchKeyword} in service description`,
    },
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      payment_id: typia.random<string & tags.Format<"uuid">>(),
      customer_id: typia.random<string & tags.Format<"uuid">>(),
      dispute_type: "chargeback",
      status: "resolved",
      resolution_status: "denied",
      amount: 125.75,
      disputed_at: "2026-01-07T08:00:00Z",
      comments: `Admin notes: ${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 })}`,
    },
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      payment_id: typia.random<string & tags.Format<"uuid">>(),
      customer_id: typia.random<string & tags.Format<"uuid">>(),
      dispute_type: "other",
      status: "open",
      resolution_status: "pending",
      amount: 22.8,
      disputed_at: "2026-01-06T08:00:00Z",
      comments: `Customer concern: ${searchKeyword} related to product quality`,
    },
  ];
  // We know there are 3 disputes matching the search keyword in comments
  const expectedCount = 3;
  // Step 3: Verify entire list returns correct total
  const allResult =
    await api.functional.shoppingMall.admin.payment_disputes.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallPaymentDispute.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.equals(
    "total records should match",
    allResult.pagination.records,
    5,
  );
  // Step 4: Test pagination with different limit values
  const testLimits = [1, 2, 3, 5];
  for (const limit of testLimits) {
    const pageResults =
      await api.functional.shoppingMall.admin.payment_disputes.index(
        adminConnection,
        {
          body: {
            limit,
            disputeReason: searchKeyword,
          } satisfies IShoppingMallPaymentDispute.IRequest,
        },
      );
    typia.assert(pageResults);
    // Validate total records remains the same
    TestValidator.equals(
      `total records for limit ${limit}`,
      pageResults.pagination.records,
      5,
    );
    // Validate pages calculation
    const expectedPages = Math.ceil(expectedCount / limit);
    TestValidator.equals(
      `pages for limit ${limit}`,
      pageResults.pagination.pages,
      expectedPages,
    );
    // Validate the data has at most 'limit' items
    TestValidator.predicate(
      `page has at most ${limit} items`,
      () => pageResults.data.length <= limit,
    );
    // Validate the records returned match the search criteria: only in comments field
    for (const dispute of pageResults.data) {
      TestValidator.predicate(`record matches search keyword`, () =>
        dispute.comments?.toLowerCase().includes(searchKeyword) ?? false,
      );
    }
  }
  // Step 5: Test exact match and pagination navigation
  // Query first page with limit=2
  const firstPageResult =
    await api.functional.shoppingMall.admin.payment_disputes.index(
      adminConnection,
      {
        body: {
          limit: 2,
          disputeReason: searchKeyword,
        } satisfies IShoppingMallPaymentDispute.IRequest,
      },
    );
  typia.assert(firstPageResult);
  TestValidator.equals(
    "first page has 2 items",
    firstPageResult.data.length,
    2,
  );
  TestValidator.equals("total records", firstPageResult.pagination.records, 5);
  TestValidator.equals("total pages", firstPageResult.pagination.pages, 2); // 3 records limit 2 → 2 pages
  // Query second page with limit=2
  const secondPageResult =
    await api.functional.shoppingMall.admin.payment_disputes.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 2,
          disputeReason: searchKeyword,
        } satisfies IShoppingMallPaymentDispute.IRequest,
      },
    );
  typia.assert(secondPageResult);
  TestValidator.equals(
    "second page has 1 item",
    secondPageResult.data.length,
    1,
  );
  TestValidator.equals("total records", secondPageResult.pagination.records, 5);
  TestValidator.equals("total pages", secondPageResult.pagination.pages, 2);
  // Validate all 3 expected records are found across both pages
  const allFoundResults = [...firstPageResult.data, ...secondPageResult.data];
  TestValidator.equals("all three records found", allFoundResults.length, 3);
  // Validate that all returned disputes contain the search keyword in admin comments
  for (const dispute of allFoundResults) {
    TestValidator.predicate(
      `dispute contains search keyword in comments`,
      () => {
        return dispute.comments?.toLowerCase().includes(searchKeyword) ?? false;
      },
    );
  }
  // Step 6: Verify no results with non-existent search term
  const noResults =
    await api.functional.shoppingMall.admin.payment_disputes.index(
      adminConnection,
      {
        body: {
          disputeReason: "nonexistentkeywordthatshouldnotexist",
        } satisfies IShoppingMallPaymentDispute.IRequest,
      },
    );
  typia.assert(noResults);
  TestValidator.equals(
    "no results for non-existent term",
    noResults.pagination.records,
    0,
  );
  TestValidator.equals("no results data array", noResults.data.length, 0);
}