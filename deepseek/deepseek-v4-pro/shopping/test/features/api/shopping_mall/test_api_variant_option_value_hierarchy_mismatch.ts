import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test option value hierarchy mismatch enforcement.
 *
 * Validates that the entity hierarchy chain is strictly enforced when a customer attempts to retrieve an option value using a mismatched variant ID. The option value belongs to one variant but the customer provides a different variant's ID in the URL path, triggering the step 2 validation that checks whether the option value's `shopping_mall_product_variant_id` matches the provided `variantId`.
 *
 * 1. Administrator creates a product category.
 * 2. Seller registers and is approved by the administrator.
 * 3. Seller creates a product under the category.
 * 4. Seller creates variant 1 with option value (key: "color", value: "Red").
 * 5. Seller creates variant 2 with different option value (key: "color", value: "Blue").
 * 6. Customer authenticates and attempts to retrieve variant 1's option value using variant 2's ID.
 * 7. System returns 404 Not Found, confirming option values are properly scoped within their parent variant.
 */
export async function test_api_variant_option_value_hierarchy_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller registers
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Seller creates variant 1 with option value "color: Red"
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          optionValues: [{ key: "color", value: "Red" }],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant1);
  // 6. Seller creates variant 2 with option value "color: Blue"
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          optionValues: [{ key: "color", value: "Blue" }],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant2);
  // 7. Customer authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 8. Attempt cross-variant access: variant1's option value, variant2's ID
  const variant1OptionId = variant1.optionValues[0].id;
  await TestValidator.error(
    "option value hierarchy mismatch - 404 when option value belongs to different variant",
    async () => {
      await api.functional.shoppingMall.customer.products.variants.options.at(
        customerConnection,
        {
          productId: product.id,
          variantId: variant2.id,
          optionId: variant1OptionId,
        },
      );
    },
  );
}
