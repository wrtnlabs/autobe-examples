import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller soft-deletes their own product attribute in absence of
 * dependent SKUs or mappings.
 *
 * This scenario covers:
 *
 * 1. Seller registration (join)
 * 2. Product creation
 * 3. Attribute creation via admin API (mimicking real-world admin-driven
 *    configuration for test setup)
 * 4. Seller soft-deletes that attribute
 * 5. Confirm attribute's deleted_at field is set
 *
 * Ensures: Seller can only delete their own product's attributes. Deletion is
 * blocked if there are dependent SKUs or value mappings (not tested here, but
 * should be validated in adjacent scenarios). Soft-delete allows auditability
 * and future restoration, preserving catalog integrity.
 */
export async function test_api_product_attribute_soft_deletion_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller registers
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerRegNum = RandomGenerator.alphaNumeric(10);
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.name(2),
      registration_number: sellerRegNum,
      business_phone: RandomGenerator.mobile(),
      href: "https://shop-frontend.example.com/register",
      referrer: "https://shop-frontend.example.com/landing",
      ip: undefined,
    },
  });
  typia.assert(sellerJoin);

  // 2. Seller creates a product
  const productCreate = {
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    default_price: 27500,
    business_status: "draft",
  };
  const product = await api.functional.shoppingMall.products.create(
    connection,
    {
      body: productCreate,
    },
  );
  typia.assert(product);

  // 3. Attribute creation by admin API (simulate system/admin-driven config)
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name(2);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    },
  });
  typia.assert(admin);
  // Switch to admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  const attributeName = RandomGenerator.name(1);
  const attribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: {
          attribute_name: attributeName,
          position: 0,
        },
      },
    );
  typia.assert(attribute);
  // Switch back to seller
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://shop-frontend.example.com/login",
      referrer: "https://shop-frontend.example.com/landing",
      ip: undefined,
    },
  });

  // 4. Seller soft-deletes the attribute (should be successful, no dependencies case)
  const deletedAttribute =
    await api.functional.shoppingMall.seller.products.attributes.erase(
      connection,
      {
        productId: product.id,
        attributeId: attribute.id,
      },
    );
  typia.assert(deletedAttribute);
  // 5. Check that deleted_at is set after deletion (soft-delete)
  TestValidator.predicate(
    "deleted_at should be a valid date-time string after attribute soft-delete",
    typeof deletedAttribute.deleted_at === "string" &&
      deletedAttribute.deleted_at.length > 0,
  );
  // (Edge case: If SKUs or attribute-value mappings exist, deletion should fail. That is not tested here and should be a separate test scenario.)
}
