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
 * Test successful retrieval of a product variant's option value by a customer.
 *
 * Validates the primary success path where a customer browses a product's variant
 * details and retrieves a specific option value that defines the variant's
 * attributes. The test establishes a complete hierarchy spanning three actors:
 * an administrator who creates the category and approves the seller, a seller who
 * creates the product and variant with option values, and a customer who retrieves
 * the option value.
 *
 * The core validation confirms that the returned option value matches the original
 * creation data — the key (dimension name) and value (specific attribute) are
 * preserved exactly as provided. All type-level validations including UUID format,
 * non-empty strings, and ISO 8601 date-time timestamps are handled by typia.assert,
 * ensuring the full response shape conforms to the DTO specification without
 * redundant manual checks.
 *
 * 1. Administrator registers and creates a top-level category.
 * 2. Seller registers and is approved by the administrator.
 * 3. Seller creates a product under the category.
 * 4. Seller creates a variant with two option values (color: "Red", size: "Large").
 * 5. Customer registers and authenticates.
 * 6. Customer retrieves the first option value by its ID through the product/variant/option hierarchy.
 * 7. Validates the retrieved key and value match the original creation data.
 */
export async function test_api_variant_option_value_successful_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 4. Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 5. Seller creates a product under the category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  typia.assert(product);
  // 6. Seller creates a variant with explicit option values
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          optionValues: [
            {
              key: "color",
              value: "Red",
            } satisfies IShoppingMallProductVariantOptionValue.ICreate,
            {
              key: "size",
              value: "Large",
            } satisfies IShoppingMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  typia.assert(variant);
  // Select the first option value for retrieval
  const targetOption = variant.optionValues[0];
  typia.assertGuard(targetOption);
  // 7. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 8. Customer retrieves the specific option value
  const optionValue =
    await api.functional.shoppingMall.customer.products.variants.options.at(
      customerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        optionId: targetOption.id,
      },
    );
  typia.assert(optionValue);
  // 9. Validate business data — key and value match the original creation
  TestValidator.equals("option key", optionValue.key, targetOption.key);
  TestValidator.equals("option value", optionValue.value, targetOption.value);
}
