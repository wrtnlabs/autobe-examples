import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test partial failure scenario for bulk seller ban operation.
 *
 * This test validates that the bulk ban endpoint correctly handles a mix of
 * successful and failed ban operations:
 * 1. Some sellers are successfully banned (active sellers)
 * 2. One seller fails because they're already banned (ALREADY_BANNED error)
 * 3. One seller fails because they don't exist (SELLER_NOT_FOUND error)
 *
 * The test verifies that the response contains accurate success counts and
 * detailed error information for each failed seller.
 */
export async function test_api_seller_bulk_ban_partial_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "http://localhost/admin/login",
      referrer: "http://localhost/admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Create three seller accounts
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: `seller1-${typia.random<string & tags.Format<"email">>()}@test.com`,
      password: "password123",
      shop_name: RandomGenerator.name(2),
      href: "http://localhost/seller/join",
      referrer: "http://localhost",
    },
  });
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: `seller2-${typia.random<string & tags.Format<"email">>()}@test.com`,
      password: "password123",
      shop_name: RandomGenerator.name(2),
      href: "http://localhost/seller/join",
      referrer: "http://localhost",
    },
  });
  const seller3Connection: api.IConnection = { host: connection.host };
  const seller3 = await authorize_seller_join(seller3Connection, {
    body: {
      email: `seller3-${typia.random<string & tags.Format<"email">>()}@test.com`,
      password: "password123",
      shop_name: RandomGenerator.name(2),
      href: "http://localhost/seller/join",
      referrer: "http://localhost",
    },
  });
  typia.assert(seller1);
  typia.assert(seller2);
  typia.assert(seller3);
  // 3. Pre-ban seller2 to test ALREADY_BANNED error
  const bannedSeller2 = await api.functional.shoppingMall.admin.sellers.ban(
    adminConnection,
    {
      sellerId: seller2.id,
    },
  );
  typia.assert(bannedSeller2);
  // Verify seller2 is now banned
  TestValidator.equals("seller2 is banned", bannedSeller2.status, "banned");
  // 4. Prepare bulk ban request with:
  // - seller1 (active, should succeed)
  // - seller2 (already banned, should fail with ALREADY_BANNED)
  // - seller3 (active, should succeed)
  // - non-existent seller ID (should fail with SELLER_NOT_FOUND)
  const nonExistentSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const bulkBanResult =
    await api.functional.shoppingMall.admin.sellers.bulk_ban.bulkBan(
      adminConnection,
      {
        body: {
          sellerIds: [seller1.id, seller2.id, seller3.id, nonExistentSellerId],
          reason: "Test bulk ban partial failure scenario",
        } satisfies IShoppingMallSeller.IBulkBan,
      },
    );
  // 5. Validate response structure
  typia.assert(bulkBanResult);
  // 6. Verify success count (should be 2: seller1 and seller3)
  TestValidator.equals(
    "successCount should be 2",
    bulkBanResult.successCount,
    2,
  );
  // 7. Verify failed count (should be 2: seller2 and nonExistentSellerId)
  TestValidator.equals(
    "failed array should have 2 entries",
    bulkBanResult.failed.length,
    2,
  );
  // 8. Find and verify ALREADY_BANNED error for seller2
  const alreadyBannedError = bulkBanResult.failed.find(
    (item) => item.sellerId === seller2.id,
  );
  const safeAlreadyBannedError = typia.assert(alreadyBannedError!);
  TestValidator.equals(
    "seller2 error code should be ALREADY_BANNED",
    safeAlreadyBannedError.errorCode,
    "ALREADY_BANNED",
  );
  TestValidator.predicate(
    "seller2 error message is present",
    safeAlreadyBannedError.errorMessage.length > 0,
  );
  // 9. Find and verify SELLER_NOT_FOUND error for nonExistentSellerId
  const notFoundError = bulkBanResult.failed.find(
    (item) => item.sellerId === nonExistentSellerId,
  );
  const safeNotFoundError = typia.assert(notFoundError!);
  TestValidator.equals(
    "non-existent seller error code should be SELLER_NOT_FOUND",
    safeNotFoundError.errorCode,
    "SELLER_NOT_FOUND",
  );
  TestValidator.predicate(
    "non-existent seller error message is present",
    safeNotFoundError.errorMessage.length > 0,
  );
  // 10. Verify seller1 and seller3 were actually banned by attempting to ban them again
  await TestValidator.error("seller1 should be already banned", async () => {
    await api.functional.shoppingMall.admin.sellers.ban(adminConnection, {
      sellerId: seller1.id,
    });
  });
  await TestValidator.error("seller3 should be already banned", async () => {
    await api.functional.shoppingMall.admin.sellers.ban(adminConnection, {
      sellerId: seller3.id,
    });
  });
}