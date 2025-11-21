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
 * Test creation of multiple attributes for a single product, validating that
 * sellers can define comprehensive product specifications with different
 * attribute types. Tests attribute uniqueness enforcement per product and
 * proper display ordering functionality.
 */
export async function test_api_product_attribute_creation_multiple_attributes(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
      permissions: JSON.stringify({ canManageCategories: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        active: true,
        parent_id: undefined,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123";
  const sellerBusinessName = RandomGenerator.paragraph({ sentences: 2 });

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: sellerBusinessName,
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.content({ paragraphs: 1 }),
      tax_id: undefined,
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(10),
        price: typia.random<number & tags.Minimum<0> & tags.Maximum<10000>>(),
        compare_price: undefined,
        cost_price: undefined,
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
        >(),
        status: "draft",
        condition: "new",
        weight: undefined,
        dimensions: undefined,
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          display_order: category.display_order,
          active: category.active,
          parent_id:
            category.parent?.id ?? typia.random<string & tags.Format<"uuid">>(),
          created_at: category.created_at,
          updated_at: category.updated_at,
          parent: category.parent,
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

  // Step 5: Create multiple attributes with different types
  const attributeDefinitions = [
    { name: "Color", value: "Black", order: 1 },
    { name: "Size", value: "Large", order: 2 },
    { name: "Material", value: "Cotton", order: 3 },
    { name: "Weight", value: "2.5kg", order: 4 },
    { name: "Warranty", value: "2 years", order: 5 },
  ] as const;

  const createdAttributes: IShoppingMallProductAttribute[] = [];

  for (const attrDef of attributeDefinitions) {
    const attribute =
      await api.functional.shoppingMall.seller.products.attributes.create(
        connection,
        {
          productId: product.id,
          body: {
            shopping_mall_product_id: product.id,
            attribute_name: attrDef.name,
            attribute_value: attrDef.value,
            display_order: attrDef.order,
          } satisfies IShoppingMallProductAttribute.ICreate,
        },
      );
    typia.assert(attribute);
    createdAttributes.push(attribute);

    // Validate attribute creation
    TestValidator.equals(
      `attribute ${attrDef.name} should have correct product ID`,
      attribute.shopping_mall_product_id,
      product.id,
    );
    TestValidator.equals(
      `attribute ${attrDef.name} should have correct name`,
      attribute.attribute_name,
      attrDef.name,
    );
    TestValidator.equals(
      `attribute ${attrDef.name} should have correct value`,
      attribute.attribute_value,
      attrDef.value,
    );
    TestValidator.equals(
      `attribute ${attrDef.name} should have correct display order`,
      attribute.display_order,
      attrDef.order,
    );
  }

  // Step 6: Test attribute uniqueness enforcement
  await TestValidator.error(
    "creating duplicate attribute name should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.attributes.create(
        connection,
        {
          productId: product.id,
          body: {
            shopping_mall_product_id: product.id,
            attribute_name: "Color", // Already exists
            attribute_value: "Red", // Different value
            display_order: 6,
          } satisfies IShoppingMallProductAttribute.ICreate,
        },
      );
    },
  );

  // Step 7: Validate display order functionality
  TestValidator.equals(
    "should have correct number of attributes created",
    createdAttributes.length,
    attributeDefinitions.length,
  );

  // Verify attributes are sorted by display order
  const sortedAttributes = [...createdAttributes].sort(
    (a, b) => a.display_order - b.display_order,
  );
  TestValidator.equals(
    "attributes should be sorted by display order",
    sortedAttributes.map((attr) => attr.display_order),
    [1, 2, 3, 4, 5],
  );

  // Step 8: Validate attribute relationships
  for (const attribute of createdAttributes) {
    TestValidator.predicate(
      `attribute ${attribute.attribute_name} should have valid UUID ID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        attribute.id,
      ),
    );
    TestValidator.predicate(
      `attribute ${attribute.attribute_name} should have valid creation timestamp`,
      !isNaN(new Date(attribute.created_at).getTime()),
    );
    TestValidator.predicate(
      `attribute ${attribute.attribute_name} should have valid update timestamp`,
      !isNaN(new Date(attribute.updated_at).getTime()),
    );
  }

  // Step 9: Test creating attribute with different display orders
  const newAttribute =
    await api.functional.shoppingMall.seller.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          attribute_name: "Brand",
          attribute_value: "Premium",
          display_order: 0, // Lower than existing
        } satisfies IShoppingMallProductAttribute.ICreate,
      },
    );
  typia.assert(newAttribute);

  TestValidator.equals(
    "new attribute with lower display order should be created successfully",
    newAttribute.attribute_name,
    "Brand",
  );
}
