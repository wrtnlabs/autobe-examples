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
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a product with no variants is visible to customers but displayed as unavailable for purchase.
 *
 * Validates the complete flow from product creation through customer viewing, confirming the business rule that newly created products appear in the catalog but cannot be purchased until at least one variant with stock exists.
 *
 * The test verifies that the product detail response correctly reflects the variant-less state: an empty variants array, null average rating (distinguishing "no rating" from a low numeric score), zero review count, and an empty reviews array. These signals inform the customer-facing UI that the product exists but is not yet ready for purchase.
 *
 * 1. Administrator registers and creates a category for product classification.
 * 2. Seller registers and is approved by the administrator.
 * 3. Approved seller creates a product — which starts with no variants by default.
 * 4. Customer registers and retrieves the product detail page.
 * 5. Validates that variants and reviews are empty while average_rating is null and review_count is zero.
 */
export async function test_api_product_detail_no_variants_unavailable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates a category for product classification
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller registration (starts pending)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 4. Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 5. Approved seller creates a product (no variants by default)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  typia.assert(product);
  // 6. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 7. Customer views product detail page
  const productDetail = await api.functional.shoppingMall.customer.products.at(
    customerConnection,
    { productId: product.id },
  );
  typia.assert(productDetail);
  // 8. Validate business rules for variant-less product
  TestValidator.equals("variants empty", productDetail.variants, []);
  TestValidator.equals(
    "average rating null",
    productDetail.average_rating,
    null,
  );
  TestValidator.equals("review count zero", productDetail.review_count, 0);
  TestValidator.equals("reviews empty", productDetail.reviews, []);
}
