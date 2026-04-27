import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that an approved seller can successfully update their own product variant's
 * price override and option values.
 *
 * Validates that updating a variant's price and options works correctly: the price
 * reflects the new value, the option values are updated, the variant's id and
 * sku_code remain unchanged, and the updated_at timestamp is refreshed.
 *
 * 1. Seller registers and authenticates.
 * 2. Seller creates a product.
 * 3. Seller creates a variant with initial options (color: "Red", size: "Small").
 * 4. Seller updates the variant's price to a new value and changes options
 *    (size: "Medium").
 * 5. Validates the updated variant's fields.
 */
export async function test_api_product_variant_price_and_options_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });

  // 2. Seller creates a product
  const product =
    await generate_random_e_commerce_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);

  // 3. Seller creates a variant with initial options
  const initialOptions: IECommerceMallProductVariant.IOption[] = [
    { key: "color", value: "Red" },
    { key: "size", value: "Small" },
  ];
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          options: initialOptions,
        },
      },
    );
  typia.assert(variant);

  const oldUpdatedAt = variant.updated_at;

  // 4. Update variant's price and change options
  const newPrice: number = product.base_price + 1000;
  const updateOptions: IECommerceMallProductVariantOption[] = [
    {
      ...typia.random<IECommerceMallProductVariantOption>(),
      key: "color",
      value: "Red",
    },
    {
      ...typia.random<IECommerceMallProductVariantOption>(),
      key: "size",
      value: "Medium",
    },
  ];

  const updated =
    await api.functional.eCommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: newPrice,
          options: updateOptions,
        } satisfies IECommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updated);

  // 5. Validations
  TestValidator.equals("variant id unchanged", updated.id, variant.id);
  TestValidator.equals(
    "sku_code unchanged",
    updated.sku_code,
    variant.sku_code,
  );
  TestValidator.equals("price updated", updated.price, newPrice);
  TestValidator.predicate(
    "updated_at refreshed",
    updated.updated_at > oldUpdatedAt,
  );

  const updatedColor = updated.options.find((o) => o.key === "color");
  const updatedSize = updated.options.find((o) => o.key === "size");
  TestValidator.equals("color option preserved", updatedColor?.value, "Red");
  TestValidator.equals("size option updated", updatedSize?.value, "Medium");
}