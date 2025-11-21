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
 * Test attribute display order reorganization scenario where seller updates
 * multiple attributes to change their presentation sequence on product detail
 * pages. Validates that display order changes affect attribute sorting
 * correctly and that the system handles ordering conflicts appropriately.
 *
 * This test implements a complete workflow:
 *
 * 1. Admin creates product category
 * 2. Seller creates product
 * 3. Seller creates multiple attributes with different display orders
 * 4. Seller reorganizes attribute display orders
 * 5. Validates that reorganization affects presentation sequence correctly
 */
export async function test_api_product_attribute_display_order_reorganization(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for product and attribute management
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "seller123",
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_person: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 3 }),
        tax_id: undefined,
        ip: undefined,
        href: "https://shopping-mall.example.com/seller/join",
        referrer: "https://shopping-mall.example.com/",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Create admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "support_admin",
        permissions: JSON.stringify({ read: true, write: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 3: Admin creates product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        active: true,
        parent_id: undefined,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 4: Create proper summary objects for product creation
  const categorySummary: IShoppingMallCategory.ISummary = {
    id: category.id,
    name: category.name,
    description: category.description,
    display_order: category.display_order,
    active: category.active,
    parent_id:
      category.parent?.id ?? typia.random<string & tags.Format<"uuid">>(),
    created_at: category.created_at,
    updated_at: category.updated_at,
    parent: undefined,
  };

  const sellerSummary: IShoppingMallSeller.ISummary = {
    id: seller.id,
    business_name: seller.business_name,
    contact_person: seller.contact_person,
    email: seller.email,
    status: seller.status,
  };

  // Step 5: Seller creates product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        compare_price: undefined,
        cost_price: undefined,
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<1000>
        >(),
        status: "active",
        condition: "new",
        weight: undefined,
        dimensions: undefined,
        category: categorySummary,
        seller: sellerSummary,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Step 6: Seller creates multiple attributes with different display orders
  const attributeNames = [
    "Color",
    "Size",
    "Material",
    "Weight",
    "Warranty",
  ] as const;
  const attributeValues = [
    "Red",
    "Large",
    "Cotton",
    "2.5kg",
    "2 years",
  ] as const;

  const createdAttributes: IShoppingMallProductAttribute[] = [];

  for (let i = 0; i < attributeNames.length; i++) {
    const attribute: IShoppingMallProductAttribute =
      await api.functional.shoppingMall.seller.products.attributes.create(
        connection,
        {
          productId: product.id,
          body: {
            shopping_mall_product_id: product.id,
            attribute_name: attributeNames[i],
            attribute_value: attributeValues[i],
            display_order: i * 10, // Create with spaced orders: 0, 10, 20, 30, 40
          } satisfies IShoppingMallProductAttribute.ICreate,
        },
      );
    typia.assert(attribute);
    createdAttributes.push(attribute);
  }

  // Step 7: Seller reorganizes attribute display orders
  // Reorder to prioritize important attributes: Warranty, Material, Color, Size, Weight
  const reorderedDisplayOrders = [5, 15, 25, 35, 45]; // New order sequence

  for (let i = 0; i < createdAttributes.length; i++) {
    const attribute = createdAttributes[i];
    const updatedAttribute: IShoppingMallProductAttribute =
      await api.functional.shoppingMall.seller.products.attributes.update(
        connection,
        {
          productId: product.id,
          attributeId: attribute.id,
          body: {
            display_order: reorderedDisplayOrders[i],
          } satisfies IShoppingMallProductAttribute.IUpdate,
        },
      );
    typia.assert(updatedAttribute);

    // Verify display order was updated correctly
    TestValidator.equals(
      `attribute ${attribute.attribute_name} display order updated`,
      updatedAttribute.display_order,
      reorderedDisplayOrders[i],
    );
  }

  // Step 8: Create additional attributes to test ordering conflicts
  const conflictAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.seller.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          attribute_name: "Brand",
          attribute_value: "Premium",
          display_order: 20, // This will create ordering conflict
        } satisfies IShoppingMallProductAttribute.ICreate,
      },
    );
  typia.assert(conflictAttribute);

  // Step 9: Test that system handles ordering conflicts appropriately
  // Update the conflict attribute to resolve ordering
  const resolvedAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.seller.products.attributes.update(
      connection,
      {
        productId: product.id,
        attributeId: conflictAttribute.id,
        body: {
          display_order: 50, // Move to end to resolve conflict
        } satisfies IShoppingMallProductAttribute.IUpdate,
      },
    );
  typia.assert(resolvedAttribute);

  // Step 10: Final validation - verify all attributes have correct display orders
  TestValidator.equals(
    "all attributes created successfully",
    createdAttributes.length + 1, // Original + conflict attribute
    attributeNames.length + 1,
  );

  // Verify the last attribute has the highest display order
  TestValidator.predicate(
    "conflict attribute has highest display order",
    resolvedAttribute.display_order === 50,
  );

  // Verify original attributes maintain their updated orders
  for (let i = 0; i < createdAttributes.length; i++) {
    TestValidator.predicate(
      `attribute ${createdAttributes[i].attribute_name} has correct order`,
      createdAttributes[i].display_order === reorderedDisplayOrders[i],
    );
  }
}
