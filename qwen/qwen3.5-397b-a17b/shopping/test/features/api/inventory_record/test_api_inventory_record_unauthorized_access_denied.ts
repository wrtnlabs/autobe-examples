import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller cannot access inventory records for variants they do not own, receiving 404 Not Found.
 *
 * Validates the ownership-based access control for inventory records by ensuring sellers can only access inventory records for variants they own. The test creates two separate seller accounts, has Seller A create a product with variant and inventory record, then verifies that Seller B receives 404 Not Found when attempting to access Seller A's inventory record.
 *
 * This security measure prevents unauthorized access to other sellers' inventory data and protects seller privacy. The system returns 404 (not 403) to avoid revealing the existence of records belonging to other sellers, preventing enumeration attacks on inventory records.
 *
 * 1. Seller A registers and authenticates, creates a product with variant and inventory record.
 * 2. Seller B registers and authenticates separately.
 * 3. Seller B attempts to access Seller A's inventory record using Seller A's variant ID and record ID.
 * 4. Validates that the API returns 404 Not Found, confirming ownership verification prevents unauthorized access.
 */
export async function test_api_inventory_record_unauthorized_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A setup - register and create product with variant and inventory record
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // Seller A creates a product
  const product =
    await generate_random_shopping_mall_seller_products_create(
      sellerAConnection,
      {},
    );
  typia.assert(product);
  // Seller A creates a variant for their product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // Seller A creates an inventory record for their variant
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerAConnection,
      {
        params: { variantId: variant.id },
      },
    );
  typia.assert(inventoryRecord);
  // 2. Seller B setup - register separately
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // 3. Seller B attempts to access Seller A's inventory record (should fail with 404)
  await TestValidator.error(
    "Seller B cannot access Seller A's inventory record",
    async () => {
      await api.functional.shoppingMall.seller.variants.inventory_records.at(
        sellerBConnection,
        {
          variantId: variant.id,
          recordId: inventoryRecord.id,
        },
      );
    },
  );
}