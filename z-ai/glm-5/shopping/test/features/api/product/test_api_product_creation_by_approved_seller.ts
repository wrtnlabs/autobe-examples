import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test product creation by an approved seller.
 *
 * This scenario validates the complete workflow:
 * 1. Administrator creates a category
 * 2. Seller registers with pending approval status
 * 3. Administrator approves the seller
 * 4. Approved seller creates a product
 *
 * Validations:
 * - Product is successfully created
 * - Product is associated with the correct seller
 * - Category assignment is correct
 * - All provided fields are stored correctly
 * - Product has empty variants and images arrays
 * - Product's deleted_at is null (active status)
 * - Timestamps are properly set
 */
export async function test_api_product_creation_by_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create category for the product
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller setup - create seller connection and register
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Verify seller is initially pending
  TestValidator.equals(
    "seller initial approval status is pending",
    sellerAuth.approvalStatus,
    "pending",
  );
  // 4. Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // Verify seller is now approved
  TestValidator.equals(
    "seller approval status is approved",
    approvedSeller.approvalStatus,
    "approved",
  );
  // 5. Create product with the approved seller
  const productName = RandomGenerator.name();
  const productDescription = RandomGenerator.paragraph({ sentences: 3 });
  const productBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<10000000>
  >();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: productDescription,
        category_id: category.id,
        base_price: productBasePrice,
      },
    },
  );
  typia.assert(product);
  // 6. Validate product properties
  TestValidator.equals("product name matches", product.name, productName);
  TestValidator.equals(
    "product description matches",
    product.description,
    productDescription,
  );
  TestValidator.equals(
    "product base price matches",
    product.base_price,
    productBasePrice,
  );
  TestValidator.equals(
    "product seller id matches",
    product.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "product category id matches",
    product.category?.id,
    category.id,
  );
  TestValidator.predicate(
    "product has empty variants",
    product.variants.length === 0,
  );
  TestValidator.predicate(
    "product has empty images",
    product.images.length === 0,
  );
  TestValidator.predicate(
    "product deleted_at is null",
    product.deleted_at === null,
  );
  TestValidator.predicate(
    "product has zero reviews",
    product.review_count === 0,
  );
  TestValidator.equals(
    "product average rating is zero",
    product.average_rating,
    0,
  );
  TestValidator.predicate(
    "product has created_at timestamp",
    product.created_at !== null,
  );
  TestValidator.predicate(
    "product has updated_at timestamp",
    product.updated_at !== null,
  );
}
