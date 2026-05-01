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
 * Test product detail response for a product without any variants.
 *
 * Validates that a product created without variants appears as unavailable for
 * purchase while still returning all core product information. This ensures
 * customers can discover products even before the seller adds purchasable
 * variants with stock.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers, then the administrator approves the seller.
 * 3. Approved seller creates a product without adding any variants.
 * 4. Customer registers and authenticates.
 * 5. Customer retrieves the product detail by product ID.
 * 6. Validates unavailability indicators: is_available is false, variants array
 *    is empty, average_rating is null, review_count is 0.
 * 7. Validates core product information is still returned: id, name, description,
 *    base_price, category reference, and seller profile are all present.
 */
export async function test_api_product_detail_without_variants_unavailable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers and creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller registers, gets approved by administrator
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 3. Approved seller creates a product without adding any variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Customer registers and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 5. Customer retrieves the product detail by product ID
  const detail = await api.functional.shoppingMall.customer.products.detail.at(
    customerConnection,
    { productId: product.id },
  );
  typia.assert(detail);
  // 6. Validate unavailability indicators
  TestValidator.equals("is_available is false", detail.is_available, false);
  TestValidator.equals("variants array is empty", detail.variants.length, 0);
  TestValidator.equals("average_rating is null", detail.average_rating, null);
  TestValidator.equals("review_count is zero", detail.review_count, 0);
  // 7. Validate core product information is still returned
  TestValidator.equals("product id matches", detail.id, product.id);
  TestValidator.equals("product name matches", detail.name, product.name);
  TestValidator.predicate(
    "description is present",
    detail.description.length > 0,
  );
  TestValidator.predicate("base_price is positive", detail.base_price > 0);
  TestValidator.equals("category id matches", detail.category.id, category.id);
  TestValidator.equals(
    "seller profile id matches",
    detail.seller.id,
    seller.profile.id,
  );
}
