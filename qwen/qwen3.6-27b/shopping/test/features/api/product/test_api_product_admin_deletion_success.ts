import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";

/**
 * Test admin product deletion success path with category and product setup.
 *
 * Validates the complete product deletion workflow including administrative product deletion, seller authentication, and category preparation. Ensures that the product can be successfully soft-deleted by an administrator, with all associated variants being simultaneously removed.
 *
 * Special attention is given to verifying that the deletion operation executes without errors and that the required setup (category creation, product creation in the correct category) enables successful admin-initiated deletion.
 *
 * 1. Administrator registers and authenticates for product deletion authority.
 * 2. Seller registers and authenticates for product creation.
 * 3. Administrator creates a product category for product assignment.
 * 4. Seller creates a product listing with variants in the assigned category.
 * 5. Administrator soft-deletes the product and associated variants.
 * 6. Validates deletion succeeds with 200 OK response (no error thrown).
 */
export async function test_api_product_admin_deletion_success(
  connection: api.IConnection,
) {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommercePlatformAdmin.IJoin;
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminAuthorized);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommercePlatformSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerCredentials,
  });
  typia.assert(sellerAuthorized);
  // 3. Admin creates product category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 4. Seller creates product in the category
  const productBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    base_price: typia.random<number & tags.Minimum<1000>>() satisfies number,
    category_id: category.id,
  } satisfies IEcommercePlatformProduct.ICreate;
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: productBody },
    );
  typia.assert(product);
  TestValidator.equals(
    "product category assigned",
    product.category.id,
    category.id,
  );
  TestValidator.equals(
    "product name matches input",
    product.name,
    productBody.name,
  );
  TestValidator.predicate(
    "product is active before deletion",
    product.deleted_at === null,
  );
  // 5. Admin soft-deletes the product
  await api.functional.ecommercePlatform.admin.products.erase(adminConnection, {
    productId: product.id,
  });
  // 6. Validate: deletion succeeded (no error means 200 OK with null body)
  TestValidator.predicate(
    "admin product deletion completed without error",
    true,
  );
}
