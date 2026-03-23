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
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test seller approval request pagination functionality.
 *
 * This test validates that administrators can paginate through seller approval
 * requests with various page sizes and verify pagination metadata accuracy.
 */
export async function test_api_seller_approval_request_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create multiple sellers and approval requests (25+ for pagination testing)
  const sellerConnections: api.IConnection[] = [];
  const sellerEmails: string[] = [];
  for (let i = 0; i < 25; i++) {
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerEmail = typia.random<string & tags.Format<"email">>();
    sellerEmails.push(sellerEmail);
    await authorize_seller_join(sellerConnection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(2),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    sellerConnections.push(sellerConnection);
  }
  // 3. Create approval requests for each seller
  const approvalRequests: IShoppingMallSellerApprovalRequest[] = [];
  for (let i = 0; i < sellerConnections.length; i++) {
    const request =
      await generate_random_shopping_mall_seller_seller_approval_requests_create(
        sellerConnections[i],
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 3 }),
          },
        },
      );
    typia.assert(request);
    approvalRequests.push(request);
  }
  // 4. Test pagination with page=1, limit=10
  const page1 =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 data count", page1.data.length, 10);
  TestValidator.equals(
    "page 1 pagination.current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 pagination.limit", page1.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 has correct total pages",
    page1.pagination.pages >= 3,
  );
  TestValidator.equals("page 1 total records", page1.pagination.records, 25);
  // 5. Test pagination with page=2, limit=10
  const page2 =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 data count", page2.data.length, 10);
  TestValidator.equals(
    "page 2 pagination.current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 pagination.limit", page2.pagination.limit, 10);
  TestValidator.equals(
    "page 2 total pages",
    page2.pagination.pages,
    page1.pagination.pages,
  );
  // Verify no duplicate IDs between page 1 and page 2
  const page1Ids = new Set(page1.data.map((r) => r.id));
  const page2Ids = new Set(page2.data.map((r) => r.id));
  const duplicates = Array.from(page1Ids).filter((id) => page2Ids.has(id));
  TestValidator.equals(
    "no duplicate IDs between page 1 and 2",
    duplicates.length,
    0,
  );
  // 6. Test pagination with page=3, limit=10
  const page3 =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.index(
      adminConnection,
      {
        body: {
          page: 3,
          limit: 10,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(page3);
  TestValidator.equals("page 3 data count", page3.data.length, 5);
  TestValidator.equals(
    "page 3 pagination.current",
    page3.pagination.current,
    3,
  );
  TestValidator.equals("page 3 pagination.limit", page3.pagination.limit, 10);
  TestValidator.equals(
    "page 3 is last page",
    page3.pagination.current,
    page3.pagination.pages,
  );
  // Verify no duplicate IDs between page 3 and previous pages
  const page3Ids = new Set(page3.data.map((r) => r.id));
  const duplicates13 = Array.from(page1Ids).filter((id) => page3Ids.has(id));
  const duplicates23 = Array.from(page2Ids).filter((id) => page3Ids.has(id));
  TestValidator.equals(
    "no duplicate IDs between page 1 and 3",
    duplicates13.length,
    0,
  );
  TestValidator.equals(
    "no duplicate IDs between page 2 and 3",
    duplicates23.length,
    0,
  );
  // 7. Test edge case: page=1, limit=100 (maximum allowed)
  const maxLimit =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(maxLimit);
  TestValidator.equals(
    "max limit returns all records",
    maxLimit.data.length,
    25,
  );
  TestValidator.equals(
    "max limit pagination.current",
    maxLimit.pagination.current,
    1,
  );
  TestValidator.equals(
    "max limit pagination.limit",
    maxLimit.pagination.limit,
    100,
  );
  TestValidator.equals("max limit single page", maxLimit.pagination.pages, 1);
  TestValidator.equals(
    "max limit total records",
    maxLimit.pagination.records,
    25,
  );
  // 8. Test edge case: page=1, limit=1
  const singleRecord =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(singleRecord);
  TestValidator.equals(
    "limit=1 returns single record",
    singleRecord.data.length,
    1,
  );
  TestValidator.equals(
    "limit=1 pagination.current",
    singleRecord.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit=1 pagination.limit",
    singleRecord.pagination.limit,
    1,
  );
  TestValidator.equals(
    "limit=1 total pages",
    singleRecord.pagination.pages,
    25,
  );
  // 9. Test edge case: requesting page beyond total pages
  const beyondPages =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.index(
      adminConnection,
      {
        body: {
          page: 100,
          limit: 10,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(beyondPages);
  TestValidator.equals(
    "beyond pages returns empty array",
    beyondPages.data.length,
    0,
  );
  TestValidator.equals(
    "beyond pages pagination.current",
    beyondPages.pagination.current,
    100,
  );
  TestValidator.equals(
    "beyond pages pagination.limit",
    beyondPages.pagination.limit,
    10,
  );
  TestValidator.equals(
    "beyond pages total records",
    beyondPages.pagination.records,
    25,
  );
  // 10. Verify records are sorted by submitted_at descending (newest first)
  const sortedCheck =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 25,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(sortedCheck);
  for (let i = 1; i < sortedCheck.data.length; i++) {
    TestValidator.predicate(
      `record ${i - 1} submitted_at >= record ${i} submitted_at`,
      new Date(sortedCheck.data[i - 1].submitted_at).getTime() >=
        new Date(sortedCheck.data[i].submitted_at).getTime(),
    );
  }
}
