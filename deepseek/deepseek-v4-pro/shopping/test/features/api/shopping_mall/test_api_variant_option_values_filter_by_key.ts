import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantOptionValue";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_options_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_options_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test filtering variant option values by key names.
 *
 * Validates that a customer can retrieve only specific variant option values by providing a key filter in the request body. The test creates a product with a variant that has three option dimensions — color "Red", size "Large", and material "Cotton" — then queries only the color and size keys to verify the material option is excluded from results.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers, gets approved by the administrator.
 * 3. Seller creates a product under the category.
 * 4. Seller creates a variant with two initial option values: color "Red" and size "Large".
 * 5. Seller adds a third option value: material "Cotton" to the variant.
 * 6. Customer registers and queries the variant's option values with a key filter of ["color", "size"].
 * 7. Validates that exactly two option values are returned, only color and size keys are present, the material key is excluded, and pagination metadata reflects the filtered record count of 2.
 */
export async function test_api_variant_option_values_filter_by_key(
  connection: api.IConnection,
) {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: { shopping_mall_category_id: category.id },
    },
  );
  typia.assert(product);
  // 4. Seller creates variant with two options
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
      },
    );
  typia.assert(variant);
  // 5. Seller adds third option
  const materialOption =
    await generate_random_shopping_mall_seller_products_variants_options_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: { key: "material", value: "Cotton" },
      },
    );
  typia.assert(materialOption);
  // 6. Customer queries option values with key filter
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const result =
    await api.functional.shoppingMall.customer.products.variants.options.index(
      customerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          keys: ["color", "size"],
        },
      },
    );
  typia.assert(result);
  // 7. Validate
  TestValidator.equals("filtered data count", result.data.length, 2);
  TestValidator.equals("pagination records", result.pagination.records, 2);
  const keys = result.data.map((item) => item.key);
  TestValidator.predicate("contains color key", keys.includes("color"));
  TestValidator.predicate("contains size key", keys.includes("size"));
  TestValidator.predicate("excludes material key", !keys.includes("material"));
}
