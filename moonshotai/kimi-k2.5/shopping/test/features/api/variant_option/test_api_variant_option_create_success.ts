import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_variants_options_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_options_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_variant_option_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Authenticate as admin to create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3. Create category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(category);
  // 4. Create product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Create variant as seller
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {},
      },
    );
  typia.assert(variant);
  // 6. Create first option (Color: Red)
  const colorOptionInput = {
    optionName: "Color",
    optionValue: "Red",
  } satisfies IEcommerceMallProductVariantOption.ICreate;
  const colorOption =
    await generate_random_ecommerce_mall_seller_variants_options_create(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: colorOptionInput,
      },
    );
  typia.assert(colorOption);
  // 7. Create second option (Size: Large)
  const sizeOptionInput = {
    optionName: "Size",
    optionValue: "Large",
  } satisfies IEcommerceMallProductVariantOption.ICreate;
  const sizeOption =
    await generate_random_ecommerce_mall_seller_variants_options_create(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: sizeOptionInput,
      },
    );
  typia.assert(sizeOption);
  // 8. Validate option data matches input (business logic validation)
  TestValidator.equals(
    "color option variantId matches",
    colorOption.productVariantId,
    variant.id,
  );
  TestValidator.equals(
    "color option name matches input",
    colorOption.optionName,
    colorOptionInput.optionName,
  );
  TestValidator.equals(
    "color option value matches input",
    colorOption.optionValue,
    colorOptionInput.optionValue,
  );
  // 9. Validate second option data matches input
  TestValidator.equals(
    "size option variantId matches",
    sizeOption.productVariantId,
    variant.id,
  );
  TestValidator.equals(
    "size option name matches input",
    sizeOption.optionName,
    sizeOptionInput.optionName,
  );
  TestValidator.equals(
    "size option value matches input",
    sizeOption.optionValue,
    sizeOptionInput.optionValue,
  );
  // 10. Validate multiple different option names can be added to same variant
  TestValidator.notEquals(
    "option names are different",
    colorOption.optionName,
    sizeOption.optionName,
  );
  TestValidator.notEquals(
    "option values are different",
    colorOption.optionValue,
    sizeOption.optionValue,
  );
}
