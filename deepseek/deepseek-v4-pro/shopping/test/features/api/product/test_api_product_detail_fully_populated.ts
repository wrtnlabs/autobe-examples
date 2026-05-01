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
 * Test customer product detail page retrieval for a fully populated product.
 *
 * Validates that the product detail endpoint returns all expected fields when a customer views an active product with no variants, images, or reviews. The test exercises the complete setup flow: administrator registration, category creation, seller registration and approval, product creation, and customer product viewing.
 *
 * Special attention is given to verifying computed fields — average_rating must be null (not zero) when no reviews exist, review_count must be 0, and the reviews array must be empty. The seller profile summary must include the profile identifier, and the category summary must include name and description matching the created category.
 *
 * 1. Administrator registers and creates a category.
 * 2. Seller registers and receives administrator approval.
 * 3. Approved seller creates a product assigned to the category.
 * 4. Customer registers and retrieves the product detail.
 * 5. Validates all product fields, computed fields, and empty collections.
 */
export async function test_api_product_detail_fully_populated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller registration and approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 3. Product creation
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Customer views product detail
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  const detail = await api.functional.shoppingMall.customer.products.at(
    customerConnection,
    { productId: product.id },
  );
  typia.assert(detail);
  // 5. Validate product fields
  TestValidator.equals("product id", detail.id, product.id);
  TestValidator.equals("product name", detail.name, product.name);
  TestValidator.equals(
    "product description",
    detail.description,
    product.description,
  );
  TestValidator.equals(
    "product base_price",
    detail.base_price,
    product.base_price,
  );
  // Validate category summary
  TestValidator.equals("category id", detail.category.id, category.id);
  TestValidator.equals("category name", detail.category.name, category.name);
  TestValidator.equals(
    "category description",
    detail.category.description,
    category.description,
  );
  // Validate seller profile
  TestValidator.equals(
    "seller profile id",
    detail.seller.id,
    seller.profile.id,
  );
  // Validate empty collections (new product has no images, variants, or reviews)
  TestValidator.equals("images count", detail.images.length, 0);
  TestValidator.equals("variants count", detail.variants.length, 0);
  TestValidator.equals("reviews count", detail.reviews.length, 0);
  // Validate computed fields
  TestValidator.equals("average_rating null", detail.average_rating, null);
  TestValidator.equals("review_count zero", detail.review_count, 0);
  // Validate timestamps and deletion state
  TestValidator.predicate("has created_at", !!detail.created_at);
  TestValidator.predicate("has updated_at", !!detail.updated_at);
  TestValidator.equals("deleted_at null", detail.deleted_at, null);
}
