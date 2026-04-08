import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_variant_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a variant with specific option values
  const optionValues = [
    { key: "color", value: "Red" },
    { key: "size", value: "Large" },
  ] as const;
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
          optionValues: [...optionValues],
        },
      },
    );
  typia.assert(variant);
  // 4. Retrieve the variant by owner
  const retrievedVariant =
    await api.functional.ecommerceMall.seller.products.variants.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
      },
    );
  typia.assert(retrievedVariant);
  // 5. Validate response fields
  TestValidator.equals(
    "sku_code matches",
    retrievedVariant.skuCode,
    variant.skuCode,
  );
  TestValidator.equals("price matches", retrievedVariant.price, variant.price);
  TestValidator.equals(
    "quantity matches",
    retrievedVariant.quantity,
    variant.quantity,
  );
  TestValidator.equals(
    "inventoryCount matches",
    retrievedVariant.inventoryCount,
    variant.inventoryCount,
  );
  TestValidator.equals(
    "product id matches",
    retrievedVariant.product.id,
    product.id,
  );
  TestValidator.equals(
    "createdAt exists",
    retrievedVariant.createdAt !== null,
    true,
  );
  TestValidator.equals(
    "updatedAt exists",
    retrievedVariant.updatedAt !== null,
    true,
  );
  TestValidator.equals("deletedAt is null", retrievedVariant.deletedAt, null);
  // 6. Validate option values match exactly
  TestValidator.equals(
    "optionValues count",
    retrievedVariant.optionValues.length,
    optionValues.length,
  );
  for (let i = 0; i < optionValues.length; i++) {
    const expectedOption = optionValues[i];
    const actualOption = retrievedVariant.optionValues[i];
    TestValidator.equals(
      `optionValues[${i}].key`,
      actualOption.key,
      expectedOption.key,
    );
    TestValidator.equals(
      `optionValues[${i}].value`,
      actualOption.value,
      expectedOption.value,
    );
  }
}
