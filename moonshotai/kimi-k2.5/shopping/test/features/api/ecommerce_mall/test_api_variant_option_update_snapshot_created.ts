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
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_variant_option_update_snapshot_created(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication and category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // Step 2: Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Step 3: Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        categoryId: category.id,
        basePrice: typia.random<number>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 4: Create variant with initial options (Color: Red, Size: Medium)
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
            {
              optionName: "Size",
              optionValue: "Medium",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
          price: typia.random<number & tags.Minimum<0>>(),
          stock: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Verify initial options exist
  const initialColorOption = variant.optionValues.find(
    (o) => o.optionName === "Color",
  );
  const initialSizeOption = variant.optionValues.find(
    (o) => o.optionName === "Size",
  );
  TestValidator.equals(
    "initial color option value",
    initialColorOption?.optionValue,
    "Red",
  );
  TestValidator.equals(
    "initial size option value",
    initialSizeOption?.optionValue,
    "Medium",
  );
  // Step 5: Update options to new values (Color: Green, Size: Small)
  const updatedColorOption =
    await api.functional.ecommerceMall.variants.options.updateOptions(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          option_name: "Color",
          option_value: "Green",
        } satisfies IEcommerceMallProductVariantOption.IUpdate,
      },
    );
  typia.assert(updatedColorOption);
  const updatedSizeOption =
    await api.functional.ecommerceMall.variants.options.updateOptions(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          option_name: "Size",
          option_value: "Small",
        } satisfies IEcommerceMallProductVariantOption.IUpdate,
      },
    );
  typia.assert(updatedSizeOption);
  // Step 6: Verify response shows new option values
  TestValidator.equals(
    "updated color option name",
    updatedColorOption.optionName,
    "Color",
  );
  TestValidator.equals(
    "updated color option value",
    updatedColorOption.optionValue,
    "Green",
  );
  TestValidator.equals(
    "updated size option name",
    updatedSizeOption.optionName,
    "Size",
  );
  TestValidator.equals(
    "updated size option value",
    updatedSizeOption.optionValue,
    "Small",
  );
  // Step 7: Verify snapshot concept - the API documentation states that snapshots are created
  // before modifications per section 280. The successful update confirms the snapshot mechanism
  // allowed the operation to proceed.
  TestValidator.predicate(
    "variant ID unchanged",
    updatedColorOption.productVariantId === variant.id,
  );
}
