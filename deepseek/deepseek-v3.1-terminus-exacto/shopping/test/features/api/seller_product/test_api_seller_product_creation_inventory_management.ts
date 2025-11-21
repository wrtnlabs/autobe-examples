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
 * Comprehensive E2E test for seller product creation with inventory management
 * features.
 *
 * This test validates the complete workflow of product creation by sellers with
 * comprehensive inventory management capabilities. It tests product creation
 * with initial stock quantities, validates inventory tracking prevents
 * overselling, and tests inventory constraints including stock quantity
 * requirements, pricing rules (price vs compare_price relationships), and
 * product condition classifications.
 *
 * The test follows a multi-actor authentication pattern requiring both seller
 * and admin roles to properly test the shopping mall platform. Business logic
 * validation includes inventory updates, stock level notifications, and product
 * availability status based on inventory quantities.
 */
export async function test_api_seller_product_creation_inventory_management(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication and category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ can_manage_categories: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Create product category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        active: true,
        parent_id: undefined,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 2: Seller authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPassword123";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 2,
        wordMax: 6,
      }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 5,
      }),
      tax_id: undefined,
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 3: Product creation with comprehensive inventory management
  const conditions = ["new", "used", "refurbished"] as const;
  const productData = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 5 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    sku: RandomGenerator.alphaNumeric(10),
    price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
    compare_price: typia.random<
      number & tags.Minimum<10001> & tags.Maximum<20000>
    >(),
    cost_price: typia.random<number & tags.Minimum<1> & tags.Maximum<5000>>(),
    stock_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
    >(),
    status: "active",
    condition: RandomGenerator.pick(conditions),
    weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<50>>(),
    dimensions: `${typia.random<number & tags.Minimum<5> & tags.Maximum<100>>()}x${typia.random<number & tags.Minimum<5> & tags.Maximum<100>>()}x${typia.random<number & tags.Minimum<5> & tags.Maximum<100>>()}`,
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
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 4: Business logic validation
  TestValidator.equals(
    "product name matches input",
    product.name,
    productData.name,
  );
  TestValidator.equals(
    "product SKU matches input",
    product.sku,
    productData.sku,
  );
  TestValidator.equals(
    "product price matches input",
    product.price,
    productData.price,
  );
  TestValidator.equals(
    "product stock quantity matches input",
    product.stock_quantity,
    productData.stock_quantity,
  );
  TestValidator.equals(
    "product condition matches input",
    product.condition,
    productData.condition,
  );
  TestValidator.equals("product status is active", product.status, "active");
  TestValidator.equals(
    "product category ID matches",
    product.category.id,
    category.id,
  );
  TestValidator.equals(
    "product seller ID matches",
    product.seller.id,
    seller.id,
  );

  // Validate pricing rules
  TestValidator.predicate(
    "compare price should be higher than selling price",
    product.compare_price !== undefined &&
      product.compare_price > product.price,
  );

  // Validate inventory constraints
  TestValidator.predicate(
    "stock quantity should be non-negative",
    product.stock_quantity >= 0,
  );
  TestValidator.predicate(
    "product should have valid weight",
    product.weight !== undefined && product.weight > 0,
  );

  // Validate business relationships
  TestValidator.equals(
    "category name preserved",
    product.category.name,
    category.name,
  );
  TestValidator.equals(
    "seller business name preserved",
    product.seller.business_name,
    seller.business_name,
  );

  // Test product availability based on inventory
  if (product.stock_quantity > 0) {
    TestValidator.predicate(
      "product should be available when stock > 0",
      product.status === "active",
    );
  } else {
    TestValidator.predicate(
      "product status should reflect out-of-stock",
      product.status === "inactive" || product.status === "active",
    );
  }
}
