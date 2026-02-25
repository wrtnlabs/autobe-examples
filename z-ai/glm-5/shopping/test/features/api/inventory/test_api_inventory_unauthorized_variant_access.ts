import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";

/**
 * Test authorization enforcement for inventory operations.
 *
 * This test validates that inventory operations require proper authorization.
 * Sellers attempting to add inventory to variants must:
 * 1. Be approved sellers
 * 2. Own the product containing the variant
 *
 * The test creates two sellers and has the second seller attempt to add
 * inventory, which should fail due to authorization requirements.
 */
export async function test_api_inventory_unauthorized_variant_access(
  connection: api.IConnection,
): Promise<void> {
  // Create first seller (would own the variant in a complete scenario)
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller1Connection, {});
  // Create second seller (attempting unauthorized access)
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {});
  // Seller 2 attempts to add inventory to a variant they don't own
  // Expected to fail with:
  // - 403 Forbidden (unauthorized - seller not approved or doesn't own variant)
  // - 404 Not Found (variant doesn't exist)
  await TestValidator.httpError(
    "unauthorized variant access",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.seller.sellers.me.variants.inventory.add.addInventory(
        seller2Connection,
        {
          variantId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallProductInventoryHistory.ICreate,
        },
      );
    },
  );
}
