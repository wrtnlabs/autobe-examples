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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_record_access_denied_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Seller A and authenticate
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shopName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(sellerA);
  // Step 2: Seller A creates a product
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerAConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<100000>
          >(),
        },
      },
    );
  typia.assert(product);
  // Step 3: Seller A creates a variant under their product
  const variant: IShoppingMallProductVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: RandomGenerator.alphaNumeric(10).toUpperCase(),
          option_values: {
            color: RandomGenerator.pick([
              "Red",
              "Blue",
              "Green",
              "Black",
              "White",
            ] as const),
            size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
          },
        },
      },
    );
  typia.assert(variant);
  // Step 4: Seller A creates an inventory record for their variant
  const inventoryRecord: IShoppingMallInventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_adjust(
      sellerAConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(inventoryRecord);
  // Step 5: Store the variantId and recordId from Seller A's resources
  const variantId = variant.id;
  const recordId = inventoryRecord.id;
  // Step 6: Create Seller B and authenticate (a different seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shopName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(sellerB);
  // Step 7: Seller B attempts to access Seller A's inventory record
  // Step 8: Verify the request fails with 403 Forbidden error
  await TestValidator.httpError(
    "Seller B cannot access Seller A's inventory record",
    403,
    async () =>
      await api.functional.shoppingMall.seller.variants.inventory.at(
        sellerBConnection,
        {
          variantId,
          recordId,
        },
      ),
  );
}
