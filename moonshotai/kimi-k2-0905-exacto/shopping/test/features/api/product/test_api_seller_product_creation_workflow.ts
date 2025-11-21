import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_product_creation_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create seller account with comprehensive business information
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const businessRegistrationNumber = RandomGenerator.alphaNumeric(10);
  const taxId = RandomGenerator.alphaNumeric(9);

  const sellerRegistrationData = {
    email: sellerEmail,
    business_name: RandomGenerator.name(2),
    business_registration_number: businessRegistrationNumber,
    tax_id: taxId,
    phone: RandomGenerator.mobile("010"),
    business_type: RandomGenerator.pick([
      "corporation",
      "llc",
      "partnership",
      "sole_proprietorship",
    ] as const),
  } satisfies IShoppingMallSeller.IJoin;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerRegistrationData,
  });
  typia.assert(seller);

  // Validate seller was created successfully
  TestValidator.equals(
    "seller verification status",
    seller.verification_status,
    "pending",
  );
  TestValidator.equals(
    "seller is not verified initially",
    seller.is_verified,
    false,
  );

  // Step 2: Create comprehensive product using ONLY properties that exist in ICreate
  const productName = RandomGenerator.paragraph({ sentences: 3 });
  const descriptionContent = RandomGenerator.content({ paragraphs: 2 });
  const sku = `PROD-${RandomGenerator.alphaNumeric(8)}`;
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const productPrice = typia.random<
    number & tags.Minimum<50> & tags.Maximum<500>
  >();
  const productWeight = typia.random<
    number & tags.Minimum<0.5> & tags.Maximum<5>
  >();
  const weightUnit = RandomGenerator.pick(["kg", "g", "lb", "oz"] as const);

  // Construct product creation data using ONLY actual DTO properties
  const productCreationData = {
    sku: sku,
    name: productName,
    description: descriptionContent,
    price: productPrice,
    compare_at_price: productPrice + 25.0,
    cost: productPrice * 0.65,
    condition: "new",
    weight: productWeight,
    weight_unit: weightUnit,
    barcode: RandomGenerator.alphaNumeric(12),
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    seo_title: productName.substring(0, min(60, productName.length)),
    seo_description: RandomGenerator.paragraph({ sentences: 2 }),
    tags: "electronics,tech,gadgets",
    featured_image: `https://example.com/images/product-${RandomGenerator.alphaNumeric(8)}.jpg`,
    category_id: categoryId,
    shopping_mall_seller_id: seller.id,
    ip: "192.168.1.100",
    href: "https://seller.example.com/products/create",
    referrer: "https://seller.example.com/dashboard",
  } satisfies IShoppingMallProduct.ICreate;

  // Step 3: Create the product with minimal assumptions about response
  const createdProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreationData,
    });
  typia.assert(createdProduct);

  // Validate core product creation success
  TestValidator.equals("product SKU matches", createdProduct.sku, sku);
  TestValidator.equals(
    "product name matches",
    createdProduct.name,
    productName,
  );
  TestValidator.equals(
    "product price matches",
    createdProduct.price,
    productPrice,
  );
  TestValidator.equals(
    "seller ID matches",
    createdProduct.seller.id,
    seller.id,
  );

  // Validate business settings
  TestValidator.equals("condition is new", createdProduct.condition, "new");
  TestValidator.equals("weight matches", createdProduct.weight, productWeight);
  TestValidator.equals(
    "weight unit matches",
    createdProduct.weight_unit,
    weightUnit,
  );
  TestValidator.equals(
    "track quantity enabled",
    createdProduct.track_quantity,
    true,
  );
  TestValidator.equals(
    "allow backorder disabled",
    createdProduct.allow_backorder,
    false,
  );
  TestValidator.equals(
    "shipping required",
    createdProduct.is_shipping_required,
    true,
  );
  TestValidator.equals("is taxable", createdProduct.is_taxable, true);

  // Validate pricing configuration
  TestValidator.equals(
    "compare at price set",
    createdProduct.compare_at_price,
    productPrice + 25.0,
  );
  TestValidator.equals("cost set", createdProduct.cost, productPrice * 0.65);
  TestValidator.predicate("price is positive", () => createdProduct.price > 0);
  TestValidator.predicate(
    "compare at price higher than price",
    () => (createdProduct.compare_at_price ?? 0) > createdProduct.price,
  );

  // Validate SEO settings
  TestValidator.notEquals("SEO title set", createdProduct.seo_title, null);
  TestValidator.notEquals(
    "SEO description set",
    createdProduct.seo_description,
    null,
  );
  TestValidator.predicate(
    "SEO title within length limit",
    () => (createdProduct.seo_title?.length ?? 0) <= 60,
  );

  // Validate metadata
  TestValidator.equals("SKU matches request", createdProduct.sku, sku);
  TestValidator.equals(
    "description matches request",
    createdProduct.description,
    descriptionContent,
  );
  TestValidator.equals(
    "category ID matches request",
    createdProduct.category?.id,
    categoryId,
  );

  // Validate response structure
  TestValidator.predicate("product has ID", () =>
    typia.is<string & tags.Format<"uuid">>(createdProduct.id),
  );
  TestValidator.predicate(
    "created_at timestamp present",
    () => createdProduct.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp present",
    () => createdProduct.updated_at !== undefined,
  );
  TestValidator.equals(
    "product status is draft by default",
    createdProduct.status,
    "draft",
  );
  TestValidator.equals(
    "published_at is null initially",
    createdProduct.published_at,
    null,
  );
  TestValidator.equals("deleted_at is null", createdProduct.deleted_at, null);

  // Validate review statistics exist and are properly initialized
  TestValidator.predicate(
    "review statistics exists",
    () => createdProduct.reviews !== undefined,
  );
  TestValidator.equals(
    "total reviews zero initially",
    createdProduct.reviews.total_reviews,
    0,
  );
  TestValidator.equals(
    "average rating zero initially",
    createdProduct.reviews.average_rating,
    "0.0",
  );

  // Validate inventory status exists
  TestValidator.predicate(
    "inventory status exists",
    () => createdProduct.inventory_status !== undefined,
  );

  // Validate seller relationship integrity
  TestValidator.equals(
    "seller ID matches request",
    createdProduct.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "seller email matches",
    createdProduct.seller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "seller business name matches",
    createdProduct.seller.business_name,
    sellerRegistrationData.business_name,
  );

  console.log("✅ Seller product creation workflow completed successfully");
}

// Helper function for minimum value
function min(a: number, b: number): number {
  return a < b ? a : b;
}
