import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerBulkUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBulkUnban";
import type { IShoppingMallSellerBulkUnbanDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBulkUnbanDetail";
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
import { generate_random_shopping_mall_admin_sellers_bulk_unban_bulk_unban } from "../../../generate/generate_random_shopping_mall_admin_sellers_bulk_unban_bulk_unban";
import { prepare_random_shopping_mall_seller_bulk_unban } from "../../../prepare/prepare_random_shopping_mall_seller_bulk_unban";

/**
 * Test the mixed result scenario where some sellers are successfully unbanned while others fail.
 *
 * This test validates that the bulk unban operation correctly handles a mix of:
 * - Sellers that are currently banned (should succeed)
 * - Sellers that are already active (should fail with 'not_banned')
 * - Invalid seller IDs that don't exist (should fail with 'not_found')
 *
 * The operation should return partial success without failing completely.
 */
export async function test_api_seller_bulk_unban_mixed_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Create seller 1 (will be banned)
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: seller1Email,
      password: "12345678",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/seller/join",
      referrer: "https://example.com/seller",
    },
  });
  typia.assert(seller1);
  const seller1Id = seller1.id;
  // 3. Create seller 2 (will be banned)
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: seller2Email,
      password: "12345678",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/seller/join",
      referrer: "https://example.com/seller",
    },
  });
  typia.assert(seller2);
  const seller2Id = seller2.id;
  // 4. Create seller 3 (will remain active, not banned)
  const seller3Connection: api.IConnection = { host: connection.host };
  const seller3Email = typia.random<string & tags.Format<"email">>();
  const seller3 = await authorize_seller_join(seller3Connection, {
    body: {
      email: seller3Email,
      password: "12345678",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/seller/join",
      referrer: "https://example.com/seller",
    },
  });
  typia.assert(seller3);
  const seller3Id = seller3.id;
  // 5. Ban seller 1 and seller 2
  await api.functional.shoppingMall.admin.sellers.ban(adminConnection, {
    sellerId: seller1Id,
  });
  await api.functional.shoppingMall.admin.sellers.ban(adminConnection, {
    sellerId: seller2Id,
  });
  // 6. Generate an invalid UUID that doesn't exist
  const invalidSellerId = typia.random<string & tags.Format<"uuid">>();
  // 7. Execute bulk unban with mixed seller IDs
  const result =
    await generate_random_shopping_mall_admin_sellers_bulk_unban_bulk_unban(
      adminConnection,
      {
        body: {
          sellerIds: [seller1Id, seller2Id, seller3Id, invalidSellerId],
        } satisfies IShoppingMallSellerBulkUnban.ICreate,
      },
    );
  typia.assert(result);
  // 8. Validate response structure
  TestValidator.equals("total submitted", result.total, 4);
  TestValidator.equals("succeeded count", result.succeeded, 2);
  TestValidator.equals("failed count", result.failed, 2);
  TestValidator.equals("details array length", result.details.length, 4);
  // 9. Validate individual results
  const seller1Detail = result.details.find((d) => d.sellerId === seller1Id);
  const seller2Detail = result.details.find((d) => d.sellerId === seller2Id);
  const seller3Detail = result.details.find((d) => d.sellerId === seller3Id);
  const invalidDetail = result.details.find(
    (d) => d.sellerId === invalidSellerId,
  );
  // Seller 1 should be successfully unbanned
  TestValidator.predicate("seller1 detail exists", seller1Detail !== undefined);
  TestValidator.equals("seller1 success", seller1Detail!.success, true);
  TestValidator.equals(
    "seller1 error reason",
    seller1Detail!.errorReason,
    null,
  );
  // Seller 2 should be successfully unbanned
  TestValidator.predicate("seller2 detail exists", seller2Detail !== undefined);
  TestValidator.equals("seller2 success", seller2Detail!.success, true);
  TestValidator.equals(
    "seller2 error reason",
    seller2Detail!.errorReason,
    null,
  );
  // Seller 3 should fail (not banned)
  TestValidator.predicate("seller3 detail exists", seller3Detail !== undefined);
  TestValidator.equals("seller3 success", seller3Detail!.success, false);
  TestValidator.predicate(
    "seller3 has error reason",
    seller3Detail!.errorReason !== null,
  );
  // Invalid seller should fail (not found)
  TestValidator.predicate("invalid detail exists", invalidDetail !== undefined);
  TestValidator.equals("invalid success", invalidDetail!.success, false);
  TestValidator.predicate(
    "invalid has error reason",
    invalidDetail!.errorReason !== null,
  );
}
