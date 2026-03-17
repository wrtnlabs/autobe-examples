import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_product_variant_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku: `${RandomGenerator.alphaNumeric(8)}-${RandomGenerator.alphaNumeric(4)}`,
          options: {
            size: RandomGenerator.name(2),
            color: RandomGenerator.name(2),
          },
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          sale_price: null,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
          >(),
          status: "active",
          sort_order: 0,
          is_default: true,
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // Store original values for comparison
  const originalSku = variant.sku;
  const originalBasePrice = variant.basePrice;
  const originalSalePrice = variant.salePrice;
  const originalStatus = variant.status;
  const originalOptions = variant.options;
  const originalUpdatedAt = variant.updatedAt;
  // 4. Update variant with new values
  const updatePayload = {
    sku: `${RandomGenerator.alphaNumeric(8)}-${RandomGenerator.alphaNumeric(4)}`,
    options: {
      size: RandomGenerator.name(2),
      color: RandomGenerator.name(2),
      material: RandomGenerator.name(2),
    },
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
    sale_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>(),
    status: "inactive",
    sort_order: 5,
    is_default: false,
  } satisfies IEcommerceMallProductVariant.IUpdate;
  const updatedVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedVariant);
  // 5. Validate updated values
  TestValidator.equals("SKU updated", updatedVariant.sku, updatePayload.sku);
  TestValidator.equals(
    "Options updated",
    JSON.stringify(updatedVariant.options),
    JSON.stringify(updatePayload.options),
  );
  TestValidator.equals(
    "Base price updated",
    updatedVariant.basePrice,
    updatePayload.base_price,
  );
  TestValidator.equals(
    "Sale price updated",
    updatedVariant.salePrice,
    updatePayload.sale_price,
  );
  TestValidator.equals(
    "Status updated",
    updatedVariant.status,
    updatePayload.status,
  );
  TestValidator.equals(
    "Sort order updated",
    updatedVariant.sortOrder,
    updatePayload.sort_order,
  );
  TestValidator.equals(
    "Is default updated",
    updatedVariant.isDefault,
    updatePayload.is_default,
  );
  // 6. Validate updated_at timestamp changed
  TestValidator.notEquals(
    "Updated at timestamp changed",
    originalUpdatedAt,
    updatedVariant.updatedAt,
  );
  // 7. Validate SKU is different from original
  TestValidator.notEquals(
    "SKU changed from original",
    originalSku,
    updatedVariant.sku,
  );
  // 8. Validate base price changed from original
  TestValidator.notEquals(
    "Base price changed from original",
    originalBasePrice,
    updatedVariant.basePrice,
  );
  // 9. Validate status changed from original
  TestValidator.notEquals(
    "Status changed from original",
    originalStatus,
    updatedVariant.status,
  );
  // 10. Validate options changed from original
  TestValidator.notEquals(
    "Options changed from original",
    JSON.stringify(originalOptions),
    JSON.stringify(updatedVariant.options),
  );
}