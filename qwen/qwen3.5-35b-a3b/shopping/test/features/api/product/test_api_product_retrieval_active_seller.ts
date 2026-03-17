import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test successful retrieval of a product with active seller.
 * Tests complete workflow from seller registration to product visibility.
 */
export async function test_api_product_retrieval_active_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account for approval operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Login as admin for approval operations
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // 2. Create seller account (automatically creates pending approval request)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoinResult);
  // 3. Seller authentication to create products
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      },
    },
  );
  typia.assert(sellerLoginResult);
  // 4. Admin approves seller registration request
  // Note: Using seller ID as approval request ID for this scenario
  const approvalConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(approvalConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  await api.functional.ecommerceMall.admin.approval_requests.update(
    approvalConnection,
    {
      approvalRequestId: sellerJoinResult.id,
      body: {
        status: "approved",
        rejection_reason: null,
      },
    },
  );
  // 5. Seller creates product with multiple variants and images
  const productCreateConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(productCreateConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  const product = await api.functional.ecommerceMall.seller.products.create(
    productCreateConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 10 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        slug: typia.random<string & tags.MaxLength<200>>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Retrieve product publicly (without authentication)
  const retrieveConnection: api.IConnection = { host: connection.host };
  const retrievedProduct = await api.functional.ecommerceMall.products.at(
    retrieveConnection,
    {
      productId: product.id,
    },
  );
  typia.assert(retrievedProduct);
  // 7. Validate product is visible and has full details
  TestValidator.equals(
    "product name matches",
    retrievedProduct.name,
    product.name,
  );
  TestValidator.equals(
    "product description matches",
    retrievedProduct.description,
    product.description,
  );
  TestValidator.equals(
    "product base price matches",
    retrievedProduct.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "product slug matches",
    retrievedProduct.slug,
    product.slug,
  );
  TestValidator.equals(
    "product status is active",
    retrievedProduct.status,
    "active",
  );
  // 8. Validate category information
  TestValidator.equals(
    "category id matches",
    retrievedProduct.category.id,
    product.category_id,
  );
  TestValidator.predicate(
    "category name present",
    retrievedProduct.category.name.length > 0,
  );
  TestValidator.predicate(
    "category slug present",
    retrievedProduct.category.slug.length > 0,
  );
  TestValidator.equals(
    "category parent is nullable",
    retrievedProduct.category.parent_id,
    null,
  );
  // 9. Validate seller shop information
  TestValidator.equals(
    "seller id matches",
    retrievedProduct.seller.id,
    sellerJoinResult.id,
  );
  TestValidator.predicate(
    "seller email present",
    retrievedProduct.seller.email.length > 0,
  );
  TestValidator.equals(
    "seller status is approved",
    retrievedProduct.seller.status,
    "approved",
  );
  // 10. Validate images ordered by display_order (ascending)
  TestValidator.predicate(
    "product has images",
    retrievedProduct.images.length > 0,
  );
  // Check images are sorted by display_order
  const images = retrievedProduct.images;
  for (let i = 1; i < images.length; i++) {
    TestValidator.predicate(
      `image ${i} display_order >= image ${i - 1}`,
      images[i].display_order >= images[i - 1].display_order,
    );
  }
  // First image should be thumbnail (display_order = 0)
  TestValidator.equals("first image is thumbnail", images[0].display_order, 0);
  // Validate image properties
  images.forEach((image, index) => {
    TestValidator.predicate(`image ${index} has url`, image.image_url.length > 0);
    TestValidator.predicate(
      `image ${index} display_order is non-negative`,
      image.display_order >= 0,
    );
    TestValidator.predicate(
      `image ${index} created_at is valid`,
      image.created_at !== undefined,
    );
  });
  // 11. Validate variants with proper data
  TestValidator.predicate(
    "product has variants",
    retrievedProduct.variants.length > 0,
  );
  const variants = retrievedProduct.variants;
  variants.forEach((variant, index) => {
    TestValidator.predicate(`variant ${index} has sku`, variant.sku.length > 0);
    TestValidator.predicate(
      `variant ${index} has base price`,
      variant.basePrice > 0,
    );
    TestValidator.predicate(
      `variant ${index} has stock quantity`,
      variant.stockQuantity >= 0,
    );
    TestValidator.predicate(
      `variant ${index} has reserved quantity`,
      variant.reservedQuantity >= 0,
    );
    TestValidator.predicate(
      `variant ${index} has sort order`,
      variant.sortOrder >= 0,
    );
    TestValidator.predicate(
      `variant ${index} has is_default flag`,
      typeof variant.isDefault === "boolean",
    );
    TestValidator.predicate(
      `variant ${index} has status`,
      variant.status !== undefined,
    );
    TestValidator.predicate(
      `variant ${index} created_at is valid`,
      variant.createdAt !== undefined,
    );
    TestValidator.predicate(
      `variant ${index} updated_at is valid`,
      variant.updatedAt !== undefined,
    );
    TestValidator.predicate(
      `variant ${index} sale_price is nullable`,
      variant.salePrice === null || variant.salePrice !== null,
    );
  });
  // 12. Validate timestamps
  TestValidator.predicate("created_at is valid date-time", () => {
    const created = new Date(retrievedProduct.created_at);
    return !isNaN(created.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const updated = new Date(retrievedProduct.updated_at);
    return !isNaN(updated.getTime());
  });
  TestValidator.equals(
    "deleted_at is null (not deleted)",
    retrievedProduct.deleted_at,
    null,
  );
}