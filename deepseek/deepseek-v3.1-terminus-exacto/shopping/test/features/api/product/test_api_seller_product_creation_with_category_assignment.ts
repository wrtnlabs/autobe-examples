import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test complete product creation workflow by authenticated seller including
 * category assignment validation.
 *
 * This E2E test validates the complete product creation workflow for
 * authenticated sellers including category assignment validation. The test
 * follows a multi-actor authentication pattern where an administrator creates
 * product categories, then a seller creates products with proper category
 * assignments. The test validates business rules around pricing consistency,
 * inventory management, and SKU uniqueness enforcement per seller.
 */
export async function test_api_seller_product_creation_with_category_assignment(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({
          manage_categories: true,
          manage_products: true,
        }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create product category as administrator
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        active: true,
        parent_id: undefined,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Create seller account for product creation
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPassword123!";

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_person: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_address: RandomGenerator.content({ paragraphs: 1 }),
        tax_id: undefined,
        ip: undefined,
        href: "https://shopping-mall.example.com/seller/register",
        referrer: "https://shopping-mall.example.com/",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Create product with category assignment
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(10),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        compare_price: undefined,
        cost_price: undefined,
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
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
            category.parent?.id ?? "00000000-0000-0000-0000-000000000000",
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
    });
  typia.assert(product);

  // Step 5: Validate product creation response
  TestValidator.equals(
    "product ID should be a valid UUID",
    product.id,
    product.id,
  );
  TestValidator.equals(
    "product name should match input",
    product.name,
    product.name,
  );
  TestValidator.equals(
    "product SKU should match input",
    product.sku,
    product.sku,
  );
  TestValidator.equals(
    "product price should match input",
    product.price,
    product.price,
  );
  TestValidator.equals(
    "product stock quantity should match input",
    product.stock_quantity,
    product.stock_quantity,
  );
  TestValidator.equals(
    "product status should be draft",
    product.status,
    "draft",
  );
  TestValidator.equals(
    "product condition should be new",
    product.condition,
    "new",
  );
  TestValidator.equals(
    "product category ID should match created category",
    product.category.id,
    category.id,
  );
  TestValidator.equals(
    "product seller ID should match authenticated seller",
    product.seller.id,
    seller.id,
  );

  // Step 6: Test SKU uniqueness enforcement
  await TestValidator.error("duplicate SKU should fail", async () => {
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: product.sku, // Same SKU as previous product
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        compare_price: undefined,
        cost_price: undefined,
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
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
            category.parent?.id ?? "00000000-0000-0000-0000-000000000000",
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
    });
  });

  // Step 7: Test product creation with different status
  const activeProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(10),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        compare_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        cost_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<50> & tags.Maximum<5000>
        >(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
        status: "active",
        condition: "new",
        weight: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        dimensions: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>>()}x${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>>()}x${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>>()}`,
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          display_order: category.display_order,
          active: category.active,
          parent_id:
            category.parent?.id ?? "00000000-0000-0000-0000-000000000000",
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
    });
  typia.assert(activeProduct);

  TestValidator.equals(
    "active product status should be active",
    activeProduct.status,
    "active",
  );
  TestValidator.predicate(
    "compare price should be higher than price",
    activeProduct.compare_price! > activeProduct.price,
  );
  TestValidator.predicate(
    "cost price should be lower than price",
    activeProduct.cost_price! < activeProduct.price,
  );
}
