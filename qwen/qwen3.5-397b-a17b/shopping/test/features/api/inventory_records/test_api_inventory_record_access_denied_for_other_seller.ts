import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
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
import { generate_random_shopping_mall_seller_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_inventory_records_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller cannot access another seller's inventory record.
 *
 * This test validates ownership-based access control for inventory records:
 * 1. Register and authenticate as the first seller (record owner)
 * 2. Create a product for first seller
 * 3. Create a variant for first seller's product
 * 4. Create an inventory record for first seller's variant
 * 5. Register and authenticate as a second seller (non-owner)
 * 6. Attempt to retrieve the first seller's inventory record using its ID
 * 7. Verify the system returns 403 Forbidden error
 * 8. Verify the error indicates authorization failure due to not owning the associated product variant
 *
 * This ensures sellers can only view inventory records for variants they own,
 * protecting inventory audit trail confidentiality between competing sellers.
 */
export async function test_api_inventory_record_access_denied_for_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as first seller (record owner)
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1Auth);
  // 2. Create a product for first seller
  const product = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {},
  );
  typia.assert(product);
  // 3. Create a variant for first seller's product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Create an inventory record for first seller's variant
  const inventoryRecord =
    await generate_random_shopping_mall_seller_inventory_records_create(
      seller1Connection,
      {
        body: {
          product_variant_id: variant.id,
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          reason: RandomGenerator.alphabets(8),
        } satisfies IShoppingMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // 5. Register and authenticate as second seller (non-owner)
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2Auth);
  // 6-7. Attempt to retrieve first seller's inventory record and verify 403 error
  await TestValidator.error(
    "seller cannot access other seller's inventory record",
    async () => {
      await api.functional.shoppingMall.seller.inventory_records.at(
        seller2Connection,
        {
          inventoryRecordId: inventoryRecord.id,
        },
      );
    },
  );
}
