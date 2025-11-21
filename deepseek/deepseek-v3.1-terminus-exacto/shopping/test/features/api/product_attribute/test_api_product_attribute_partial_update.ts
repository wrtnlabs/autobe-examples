import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test partial attribute update scenario where seller modifies only specific
 * attribute properties while leaving others unchanged. Validates that the
 * update operation supports selective field modification and maintains existing
 * values for omitted fields. The scenario tests attribute name modification
 * while preserving original attribute values and display orders, ensuring
 * backward compatibility with existing product listings and search
 * functionality.
 */
export async function test_api_product_attribute_partial_update(
  connection: api.IConnection,
) {
  // 1. Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: undefined,
      href: "https://example.com/seller/register",
      referrer: "https://example.com/seller",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 2. Create admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: JSON.stringify({ read: true, write: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // 3. Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        active: true,
        parent_id: undefined,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 4. Switch back to seller authentication
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      href: "https://example.com/seller/dashboard",
      referrer: "https://example.com/seller/register",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 5. Create product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(10),
        price: 1000,
        compare_price: undefined,
        cost_price: undefined,
        stock_quantity: 50,
        status: "active",
        condition: "new",
        weight: undefined,
        dimensions: undefined,
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          display_order: category.display_order,
          active: category.active,
          parent_id: typia.random<string & tags.Format<"uuid">>(),
          created_at: category.created_at,
          updated_at: category.updated_at,
          parent: undefined,
        } satisfies IShoppingMallCategory.ISummary,
        seller: {
          id: seller.id,
          business_name: seller.business_name,
          contact_person: seller.contact_person,
          email: seller.email,
          status: seller.status,
        } satisfies IShoppingMallSeller.ISummary,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Create initial attribute with complete specifications
  const initialAttribute =
    await api.functional.shoppingMall.seller.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          attribute_name: "Color",
          attribute_value: "Red",
          display_order: 1,
        } satisfies IShoppingMallProductAttribute.ICreate,
      },
    );
  typia.assert(initialAttribute);

  // 7. Perform partial update - modify only attribute_name
  const updatedAttribute =
    await api.functional.shoppingMall.seller.products.attributes.update(
      connection,
      {
        productId: product.id,
        attributeId: initialAttribute.id,
        body: {
          attribute_name: "Primary Color",
        } satisfies IShoppingMallProductAttribute.IUpdate,
      },
    );
  typia.assert(updatedAttribute);

  // 8. Validate that only the attribute_name changed
  TestValidator.equals(
    "attribute ID remains unchanged",
    updatedAttribute.id,
    initialAttribute.id,
  );
  TestValidator.equals(
    "product ID remains unchanged",
    updatedAttribute.shopping_mall_product_id,
    initialAttribute.shopping_mall_product_id,
  );
  TestValidator.equals(
    "attribute value remains unchanged",
    updatedAttribute.attribute_value,
    initialAttribute.attribute_value,
  );
  TestValidator.equals(
    "display order remains unchanged",
    updatedAttribute.display_order,
    initialAttribute.display_order,
  );
  TestValidator.notEquals(
    "attribute name should be updated",
    updatedAttribute.attribute_name,
    initialAttribute.attribute_name,
  );
  TestValidator.equals(
    "attribute name should be 'Primary Color'",
    updatedAttribute.attribute_name,
    "Primary Color",
  );

  // 9. Validate timestamps
  TestValidator.predicate(
    "created_at should be preserved",
    updatedAttribute.created_at === initialAttribute.created_at,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(updatedAttribute.updated_at) >
      new Date(initialAttribute.updated_at),
  );
}
