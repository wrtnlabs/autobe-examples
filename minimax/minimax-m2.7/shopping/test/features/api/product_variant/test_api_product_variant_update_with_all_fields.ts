import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_product_variant_update_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Update connection with seller authentication
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Create a parent product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create initial variant with color: Red, size: Small
  const initialVariant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
          option_values: [
            { key: "color", value: "Red" },
            { key: "size", value: "Small" },
          ],
        },
      },
    );
  typia.assert(initialVariant);
  // Validate initial variant has expected option values
  TestValidator.equals(
    "initial color option",
    initialVariant.optionValues.find((o) => o.key === "color")?.value,
    "Red",
  );
  TestValidator.equals(
    "initial size option",
    initialVariant.optionValues.find((o) => o.key === "size")?.value,
    "Small",
  );
  // 4. Update the variant with new option values (color: Blue, size: Large)
  const updateBody = typia.assert<IEcommerceMallProductVariant.IUpdate>({
    optionValues: [
      { key: "color", value: "Blue" },
      { key: "size", value: "Large" },
    ],
  });
  const updatedVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: updateBody,
      },
    );
  typia.assert(updatedVariant);
  // 5. Validate the updated variant has new option values
  TestValidator.equals(
    "updated productId",
    updatedVariant.id,
    initialVariant.id,
  );
  TestValidator.equals(
    "updated sku_code preserved",
    updatedVariant.sku_code,
    initialVariant.sku_code,
  );
  // 6. Verify option values are completely replaced
  TestValidator.equals(
    "updated color option",
    updatedVariant.optionValues.find((o) => o.key === "color")?.value,
    "Blue",
  );
  TestValidator.equals(
    "updated size option",
    updatedVariant.optionValues.find((o) => o.key === "size")?.value,
    "Large",
  );
  // Verify old values are gone
  TestValidator.predicate(
    "no Red color in updated variant",
    !updatedVariant.optionValues.some(
      (o) => o.key === "color" && o.value === "Red",
    ),
  );
  TestValidator.predicate(
    "no Small size in updated variant",
    !updatedVariant.optionValues.some(
      (o) => o.key === "size" && o.value === "Small",
    ),
  );
}