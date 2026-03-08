import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test that an approved seller can successfully create a new product with all required fields.
 *
 * Workflow:
 * 1. Admin creates a category for product classification
 * 2. Seller registers with pending approval status
 * 3. Admin approves the seller account
 * 4. Approved seller creates a product with valid fields
 * 5. Validate product response contains all required fields
 * 6. Verify product status is 'active'
 */
export async function test_api_product_creation_by_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin Setup - Create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>();
  const adminPassword = typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>();
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Login as admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Admin creates category
  const categoryName = RandomGenerator.name(2);
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminLoginConnection,
    {
      body: {
        name: categoryName,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Seller Registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>();
  const sellerPassword = typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>();
  const sellerShopName = RandomGenerator.name(2);
  const sellerJoinAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: sellerShopName,
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoinAuth);
  // Verify seller is initially pending
  TestValidator.equals(
    "seller approval status is pending after registration",
    sellerJoinAuth.approval_status,
    "pending",
  );
  // 4. Admin approves seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.sellers.approve(
      adminLoginConnection,
      {
        sellerId: sellerJoinAuth.id,
      },
    );
  typia.assert(approvedSeller);
  // Verify seller is now approved
  TestValidator.equals(
    "seller approval status is approved after admin approval",
    approvedSeller.approval_status,
    "approved",
  );
  // 5. Seller Login with approved credentials
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginAuth = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerLoginAuth);
  // 6. Seller creates product
  const productName = RandomGenerator.name(3);
  const productDescription = RandomGenerator.paragraph({ sentences: 5 });
  const productBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: productName,
        description: productDescription,
        category_id: category.id,
        base_price: productBasePrice,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 7. Validate product response
  TestValidator.equals("product has valid UUID", typeof product.id, "string");
  TestValidator.equals("product name matches input", product.name, productName);
  TestValidator.equals(
    "product description matches input",
    product.description,
    productDescription,
  );
  TestValidator.equals(
    "product base price matches input",
    product.basePrice,
    productBasePrice,
  );
  TestValidator.equals("product status is active", product.status, "active");
  TestValidator.equals(
    "product has seller information",
    typeof product.seller,
    "object",
  );
  TestValidator.equals(
    "product seller shop name matches",
    product.seller.shop_name,
    sellerShopName,
  );
  TestValidator.equals(
    "product has category information",
    typeof product.category,
    "object",
  );
  TestValidator.equals(
    "product category matches input",
    product.category.id,
    category.id,
  );
  TestValidator.equals(
    "product has images array",
    Array.isArray(product.images),
    true,
  );
  TestValidator.equals(
    "product has variants array",
    Array.isArray(product.variants),
    true,
  );
  TestValidator.predicate(
    "product has valid createdAt timestamp",
    product.createdAt !== undefined && product.createdAt !== null,
  );
  TestValidator.predicate(
    "product has valid updatedAt timestamp",
    product.updatedAt !== undefined && product.updatedAt !== null,
  );
  TestValidator.predicate(
    "createdAt is ISO date-time format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      product.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      product.updatedAt,
    ),
  );
}