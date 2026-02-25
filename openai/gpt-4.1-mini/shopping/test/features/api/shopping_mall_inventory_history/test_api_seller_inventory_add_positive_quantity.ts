import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { generate_random_shopping_mall_seller_products_variants_inventory_create_inventory_history } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create_inventory_history";
import { prepare_random_shopping_mall_inventory_history } from "../../../prepare/prepare_random_shopping_mall_inventory_history";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test adding a new inventory history record by an authenticated seller for an existing product variant.
 *
 * Steps:
 * 1. Authenticate as a new seller.
 * 2. Create a new product.
 * 3. Create a variant for that product.
 * 4. Add a positive inventory change.
 *
 * Validations:
 * - Inventory record is correctly created with positive quantity delta.
 * - Stock for variant is increased accordingly.
 * - All responses are validated using typia.assert.
 */
export async function test_api_seller_inventory_add_positive_quantity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new seller
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuth);
  // Create actor-specific connection with authorization token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${sellerAuth.token.access}` },
  };
  // 2. Create a new product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a product variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Add inventory history with a positive quantity
  const quantityDelta = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const reason = "restock";
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_create_inventory_history(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          shoppingMallProductVariantId: variant.id,
          quantityDelta: quantityDelta,
          reason: reason,
        },
      },
    );
  typia.assert(inventoryRecord);
  // Validations
  TestValidator.equals(
    "inventory quantity delta matches",
    inventoryRecord.quantityDelta,
    quantityDelta,
  );
  TestValidator.equals(
    "inventory reason matches",
    inventoryRecord.reason,
    reason,
  );
  TestValidator.equals(
    "inventory variant id matches",
    inventoryRecord.shoppingMallProductVariantId,
    variant.id,
  );
  // Stock quantity should be at least the quantity delta, as initial stock was zero
  TestValidator.predicate(
    "variant stockQuantity is increased",
    inventoryRecord.productVariant.stockQuantity >= quantityDelta,
  );
}
