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

/**
 * Test filtering seller accounts by approval status for platform quality vetting.
 *
 * This test validates the seller listing endpoint's ability to filter by approval_status,
 * which administrators use to review pending registrations and manage seller accounts.
 */
export async function test_api_seller_filter_by_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create 4 seller accounts (all start with 'pending' approval status)
  const sellerEmails: string[] = [];
  const sellerConnections: api.IConnection[] = [];
  for (let i = 0; i < 4; i++) {
    const sellerConnection: api.IConnection = { host: connection.host };
    const email = typia.random<string & tags.Format<"email">>();
    sellerEmails.push(email);
    await authorize_seller_join(sellerConnection, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(2),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    sellerConnections.push(sellerConnection);
  }
  // 3. Test filtering by 'pending' status - should return all 4 sellers
  const pendingResult = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "pending",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(pendingResult);
  TestValidator.equals(
    "pending filter returns all sellers",
    pendingResult.data.length,
    4,
  );
  TestValidator.equals(
    "pending pagination records count",
    pendingResult.pagination.records,
    4,
  );
  // Verify all returned sellers have 'pending' status
  for (const seller of pendingResult.data) {
    TestValidator.equals(
      `seller ${seller.id} has pending status`,
      seller.approval_status,
      "pending",
    );
  }
  // 4. Test filtering by 'approved' status - should return empty
  const approvedResult = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "approved",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(approvedResult);
  TestValidator.equals(
    "approved filter returns empty",
    approvedResult.data.length,
    0,
  );
  TestValidator.equals(
    "approved pagination records count",
    approvedResult.pagination.records,
    0,
  );
  // 5. Test filtering by 'rejected' status - should return empty
  const rejectedResult = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "rejected",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(rejectedResult);
  TestValidator.equals(
    "rejected filter returns empty",
    rejectedResult.data.length,
    0,
  );
  TestValidator.equals(
    "rejected pagination records count",
    rejectedResult.pagination.records,
    0,
  );
  // 6. Test filtering by 'suspended' status - should return empty
  const suspendedResult = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "suspended",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(suspendedResult);
  TestValidator.equals(
    "suspended filter returns empty",
    suspendedResult.data.length,
    0,
  );
  TestValidator.equals(
    "suspended pagination records count",
    suspendedResult.pagination.records,
    0,
  );
  // 7. Test pagination with filtered results
  const paginatedResult = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "pending",
        page: 1,
        limit: 2,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "paginated pending returns 2 sellers",
    paginatedResult.data.length,
    2,
  );
  TestValidator.equals(
    "paginated pending total records",
    paginatedResult.pagination.records,
    4,
  );
  TestValidator.equals(
    "paginated pending total pages",
    paginatedResult.pagination.pages,
    2,
  );
  TestValidator.equals(
    "paginated pending current page",
    paginatedResult.pagination.current,
    1,
  );
}
