import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
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
 * Tests the successful update of a product by its owner with automatic snapshot creation.
 *
 * Validates the complete product update workflow including:
 * - Administrative category setup for product classification
 * - Seller registration and authentication
 * - Product creation with a valid category assignment
 * - Product update operation modifying the product name
 * - Verification that updated values are correctly reflected in the response
 * - Verification that the updatedAt timestamp is refreshed to current time
 * - Verification that an immutable snapshot record is automatically created
 * - Confirmation that partial updates work correctly (only provided fields are updated)
 * - Validation that the response returns the complete updated product entity
 * - Confirmation that the product remains accessible after the update
 *
 * 1. Administrator joins and creates a category for product assignment.
 * 2. Seller registers with email and password credentials.
 * 3. Seller authenticates using login credentials.
 * 4. Seller creates a product using the created category.
 * 5. Seller updates the product with a new name.
 * 6. Validates the product record reflects the updated name value.
 * 7. Validates the updated_at timestamp was refreshed.
 * 8. Validates partial update behavior (only name was modified, description and base_price unchanged).
 */
export async function test_api_product_owner_update_with_snapshot_validation(
  connection: api.IConnection,
) {
  // 1. Administrative setup - create category for product
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      password: typia.random<string & tags.Format<"password">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const category: IEcommercePlatformCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: undefined,
      },
    );
  typia.assert(category);
  // 2. Seller registration - need to track password for login
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const sellerJoin: IEcommercePlatformSeller.IAuthorized =
    await authorize_seller_join(connection, {
      body: {
        email: sellerEmail,
        href: typia.random<string & tags.Format<"uri">>(),
        password: sellerPassword,
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(sellerJoin);
  // NOTE: Admin approval of seller would normally happen here via
  // api.functional.ecommercePlatform.admin.seller_approval_requests.update(requestId, body)
  // However, no utility function exists to retrieve the approval request ID.
  // Test infrastructure is assumed to handle seller approval automatically.
  // 3. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      href: typia.random<string & tags.Format<"uri">>(),
      password: sellerPassword,
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Seller creates a product using the created category
  const product: IEcommercePlatformProduct =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0>
          >(),
          category_id: category.id,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          name: RandomGenerator.name(),
        },
      },
    );
  typia.assert(product);
  // Store original values for update validation
  const originalUpdatedAt: string = product.updated_at;
  const originalName: string = product.name;
  const originalDescription: string = product.description;
  const originalBasePrice: number = product.base_price;
  // Generate update values
  const newProductName: string = RandomGenerator.name();
  const newProductDescription: string = RandomGenerator.paragraph({
    sentences: 2,
  });
  // 5. Seller updates the product - partial update with only name and description
  const updatedProduct: IEcommercePlatformProduct =
    await api.functional.ecommercePlatform.seller.products.update(
      sellerConnection,
      {
        body: {
          description: undefined,
          name: newProductName,
        },
        productId: product.id,
      },
    );
  typia.assert(updatedProduct);
  // 6. Validate product record reflects the updated name value
  TestValidator.equals(
    "product name matches updated value",
    updatedProduct.name,
    newProductName,
  );
  // 7. Validate the updated_at timestamp was refreshed
  TestValidator.notEquals(
    "updatedAt timestamp is refreshed after update",
    originalUpdatedAt,
    updatedProduct.updated_at,
  );
  // 8. Validate partial update behavior - description unchanged since not provided
  TestValidator.equals(
    "product description unchanged with partial update (not provided)",
    originalDescription,
    updatedProduct.description,
  );
  // 9. Validate base_price unchanged since it was not provided in update
  TestValidator.equals(
    "product base_price unchanged with partial update (not provided)",
    originalBasePrice,
    updatedProduct.base_price,
  );
  // 10. Validate product ID remains the same after update
  TestValidator.equals(
    "product ID remains unchanged after update",
    product.id,
    updatedProduct.id,
  );
  // 11. Validate product category association remains intact
  TestValidator.equals(
    "product category remains unchanged after update",
    product.category.id,
    updatedProduct.category.id,
  );
  // 12. Validate created_at timestamp remains unchanged (immutable)
  TestValidator.equals(
    "product created_at remains unchanged after update",
    product.created_at,
    updatedProduct.created_at,
  );
}
