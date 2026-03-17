import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_seller_pending_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and login admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create multiple pending sellers (25 sellers to test pagination with limit 10)
  const sellerCount = 25;
  for (let i = 0; i < sellerCount; i++) {
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.IJoin,
    });
  }
  // 3. Test pagination - page 1 with limit 10
  const page1Result =
    await api.functional.shoppingMall.admin.sellers.pending.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at,desc",
          approvalStatus: "PENDING",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 has 10 items",
    page1Result.data.length === 10,
  );
  TestValidator.predicate(
    "total records >= 25",
    page1Result.pagination.records >= sellerCount,
  );
  // 4. Test pagination - page 2 with limit 10
  const page2Result =
    await api.functional.shoppingMall.admin.sellers.pending.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
          sort: "created_at,desc",
          approvalStatus: "PENDING",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 10);
  TestValidator.predicate(
    "page 2 has 10 items",
    page2Result.data.length === 10,
  );
  // 5. Test pagination - page 3 with limit 10 (should have 5 items)
  const page3Result =
    await api.functional.shoppingMall.admin.sellers.pending.index(
      adminConnection,
      {
        body: {
          page: 3,
          limit: 10,
          sort: "created_at,desc",
          approvalStatus: "PENDING",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(page3Result);
  TestValidator.equals("page 3 current", page3Result.pagination.current, 3);
  TestValidator.predicate("page 3 has 5 items", page3Result.data.length === 5);
  // 6. Test sorting - ascending order
  const ascResult =
    await api.functional.shoppingMall.admin.sellers.pending.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 25,
          sort: "created_at,asc",
          approvalStatus: "PENDING",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(ascResult);
  // Verify ascending order (oldest first)
  for (let i = 1; i < ascResult.data.length; i++) {
    TestValidator.predicate(
      "ascending order",
      new Date(ascResult.data[i - 1].created_at) <=
        new Date(ascResult.data[i].created_at),
    );
  }
  // 7. Test sorting - descending order
  const descResult =
    await api.functional.shoppingMall.admin.sellers.pending.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 25,
          sort: "created_at,desc",
          approvalStatus: "PENDING",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(descResult);
  // Verify descending order (newest first)
  for (let i = 1; i < descResult.data.length; i++) {
    TestValidator.predicate(
      "descending order",
      new Date(descResult.data[i - 1].created_at) >=
        new Date(descResult.data[i].created_at),
    );
  }
  // 8. Verify all returned sellers have PENDING status
  for (const seller of page1Result.data) {
    TestValidator.equals(
      "seller approval status is PENDING",
      seller.approval_status,
      "PENDING",
    );
  }
  // 9. Test with different limit
  const limit20Result =
    await api.functional.shoppingMall.admin.sellers.pending.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "created_at,desc",
          approvalStatus: "PENDING",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(limit20Result);
  TestValidator.equals("limit 20 current", limit20Result.pagination.current, 1);
  TestValidator.equals("limit 20 limit", limit20Result.pagination.limit, 20);
  TestValidator.predicate(
    "limit 20 has 20 items",
    limit20Result.data.length === 20,
  );
  // 10. Verify pagination metadata consistency
  TestValidator.equals(
    "pages calculated correctly",
    page1Result.pagination.pages,
    Math.ceil(page1Result.pagination.records / page1Result.pagination.limit),
  );
}
