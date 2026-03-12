import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test pagination functionality and verify correct sorting order for seller approval requests.
 *
 * This test validates:
 * 1. Pagination returns correct number of items per page
 * 2. Pagination metadata (current, limit, records, pages) is accurate
 * 3. Sorting order (submitted_at DESC) is consistent across all pages
 * 4. Last page may contain fewer items than the limit
 */
export async function test_api_seller_approval_request_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create 25 seller approval requests to test pagination
  const sellerEmails: string[] = [];
  for (let i = 0; i < 25; i++) {
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerEmail: string = typia.random<string & tags.Format<"email">>();
    sellerEmails.push(sellerEmail);
    await authorize_seller_join(sellerConnection, {
      body: {
        email: sellerEmail,
        password: "12345678",
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    // Small delay to ensure distinct submitted_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 3. Test page 1 with limit=10
  const page1Response =
    await api.functional.shoppingMall.seller.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(page1Response);
  // Validate page 1
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 10);
  TestValidator.equals("page 1 records", page1Response.pagination.records, 25);
  TestValidator.equals("page 1 pages", page1Response.pagination.pages, 3);
  TestValidator.equals("page 1 data count", page1Response.data.length, 10);
  // 4. Test page 2 with limit=10
  const page2Response =
    await api.functional.shoppingMall.seller.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(page2Response);
  // Validate page 2
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 10);
  TestValidator.equals("page 2 records", page2Response.pagination.records, 25);
  TestValidator.equals("page 2 pages", page2Response.pagination.pages, 3);
  TestValidator.equals("page 2 data count", page2Response.data.length, 10);
  // 5. Test page 3 with limit=10
  const page3Response =
    await api.functional.shoppingMall.seller.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          page: 3,
          limit: 10,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(page3Response);
  // Validate page 3
  TestValidator.equals("page 3 current", page3Response.pagination.current, 3);
  TestValidator.equals("page 3 limit", page3Response.pagination.limit, 10);
  TestValidator.equals("page 3 records", page3Response.pagination.records, 25);
  TestValidator.equals("page 3 pages", page3Response.pagination.pages, 3);
  TestValidator.equals("page 3 data count", page3Response.data.length, 5);
  // 6. Verify sorting order (submitted_at DESC) across all pages
  // Page 1 should have newest items
  const page1LastSubmitted = new Date(
    page1Response.data[9].submitted_at,
  ).getTime();
  const page2FirstSubmitted = new Date(
    page2Response.data[0].submitted_at,
  ).getTime();
  TestValidator.predicate(
    "page 1 items newer than page 2",
    page1LastSubmitted >= page2FirstSubmitted,
  );
  // Page 2 should have newer items than page 3
  const page2LastSubmitted = new Date(
    page2Response.data[9].submitted_at,
  ).getTime();
  const page3FirstSubmitted = new Date(
    page3Response.data[0].submitted_at,
  ).getTime();
  TestValidator.predicate(
    "page 2 items newer than page 3",
    page2LastSubmitted >= page3FirstSubmitted,
  );
  // 7. Verify no duplicate items across pages
  const allIds = [
    ...page1Response.data.map((r) => r.id),
    ...page2Response.data.map((r) => r.id),
    ...page3Response.data.map((r) => r.id),
  ];
  const uniqueIds = new Set(allIds);
  TestValidator.equals("no duplicate IDs", uniqueIds.size, allIds.length);
  // 8. Test empty page request (page > total pages)
  const emptyPageResponse =
    await api.functional.shoppingMall.seller.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          page: 10,
          limit: 10,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(emptyPageResponse);
  TestValidator.equals(
    "empty page data count",
    emptyPageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty page current",
    emptyPageResponse.pagination.current,
    10,
  );
  TestValidator.equals(
    "empty page records",
    emptyPageResponse.pagination.records,
    25,
  );
}
