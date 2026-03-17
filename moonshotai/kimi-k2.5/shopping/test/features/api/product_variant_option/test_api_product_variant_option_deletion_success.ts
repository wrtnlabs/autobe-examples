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

/**
 * Test the successful deletion of a product variant option when no blocking conditions exist.
 * This validates the primary success path for sellers removing an option value from their product variant.
 *
 * Test Steps:
 * 1. Authenticate as admin to create category prerequisite
 * 2. Authenticate as seller to manage products and variants
 * 3. Create a category via admin endpoint
 * 4. Create a product via seller endpoint with the category ID
 * 5. Create a variant via seller endpoint for the product
 * 6. Create an option value via seller endpoint for the variant
 * 7. Delete the specific option value via DELETE /seller/variants/{variantId}/options/{optionId}
 *
 * Expected Results:
 * - Response returns 204 No Content indicating successful deletion
 * - The option record is permanently removed from the database (hard delete)
 * - The variant continues to exist with remaining options
 * - No error messages or blocking conditions are encountered
 */
export async function test_api_product_variant_option_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    } satisfies Partial<IEcommerceMallAdmin.IJoin> as Partial<IEcommerceMallAdmin.IJoin>,
  });
  typia.assert(admin);
  // 2. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    } satisfies Partial<IEcommerceMallSeller.IJoin> as Partial<IEcommerceMallSeller.IJoin>,
  });
  typia.assert(seller);
  // 3. Create a category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
      } satisfies Partial<IEcommerceMallCategory.ICreate> as Partial<IEcommerceMallCategory.ICreate>,
    },
  );
  typia.assert(category);
  // 4. Create a product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        categoryId: category.id,
        basePrice: 5000,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Create a variant as seller
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
            {
              optionName: "Size",
              optionValue: "Large",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
          price: null,
          stock: 100,
        } satisfies Partial<IEcommerceMallProductVariant.ICreate>,
      },
    );
  typia.assert(variant);
  // 6. Create an additional option value to delete
  const option =
    await generate_random_ecommerce_mall_seller_variants_options_create(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          optionName: "Material",
          optionValue: "Cotton",
        } satisfies IEcommerceMallProductVariantOption.ICreate,
      },
    );
  typia.assert(option);
  // 7. Delete the option value - main test target
  const deleteResult =
    await api.functional.ecommerceMall.seller.variants.options.erase(
      sellerConnection,
      {
        variantId: variant.id,
        optionId: option.id,
      },
    );
  // The operation returns void (204 No Content)
  typia.assert(deleteResult);
}
