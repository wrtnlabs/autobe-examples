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

export async function test_api_seller_product_creation_basic(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        business_name: RandomGenerator.name(2),
        business_registration_number: RandomGenerator.alphaNumeric(12),
        tax_id: RandomGenerator.alphaNumeric(9),
        phone: RandomGenerator.mobile(),
        business_type: RandomGenerator.pick([
          "corporation",
          "llc",
          "partnership",
          "sole_proprietorship",
        ] as const),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // Step 2: Create a product category first to use real category ID
  // Since category creation API isn't provided, we'll use a realistic mock approach
  // In real system, this would create an actual category
  const categoryId = "550e8400-e29b-41d4-a716-446655440000"; // Using realistic UUID for demonstration

  // Step 3: Generate comprehensive product data with realistic business values
  const productData = {
    sku: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}-${Date.now()}`,
    name: `${RandomGenerator.name(2)} Premium Product`,
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    price: typia.random<number & tags.Minimum<50> & tags.Maximum<500>>(),
    compare_at_price: typia.random<
      number & tags.Minimum<60> & tags.Maximum<600>
    >(),
    cost: typia.random<number & tags.Minimum<30> & tags.Maximum<300>>(),
    condition: RandomGenerator.pick(["new", "used", "refurbished"] as const),
    weight: typia.random<number & tags.Minimum<0.5> & tags.Maximum<25>>(),
    weight_unit: RandomGenerator.pick(["kg", "lb"] as const),
    barcode: RandomGenerator.alphaNumeric(12),
    track_quantity: true,
    allow_backorder: RandomGenerator.pick([true, false]),
    is_shipping_required: true,
    is_taxable: true,
    seo_title: `${RandomGenerator.name(3)} - Premium Quality`,
    seo_description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }),
    tags: `${RandomGenerator.name()},premium,${RandomGenerator.name()},best-seller`,
    featured_image: `https://cdn.example.com/products/${RandomGenerator.alphaNumeric(8)}-main.jpg`,
    category_id: categoryId,
    shopping_mall_seller_id: seller.id,
    href: "https://seller-portal.example.com/products/create",
    referrer: "https://seller-portal.example.com/dashboard/products",
  } satisfies IShoppingMallProduct.ICreate;

  // Step 4: Create product through seller endpoint
  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(createdProduct);

  // Step 5: Comprehensive validation of product creation
  TestValidator.equals(
    "seller ownership matches",
    createdProduct.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "seller business name matches",
    createdProduct.seller.business_name,
    seller.business_name,
  );
  TestValidator.equals(
    "product name matches input",
    createdProduct.name,
    productData.name,
  );
  TestValidator.equals(
    "product SKU matches input",
    createdProduct.sku,
    productData.sku,
  );
  TestValidator.equals(
    "product price matches input",
    createdProduct.price,
    productData.price,
  );
  TestValidator.equals(
    "product condition matches input",
    createdProduct.condition,
    productData.condition,
  );
  TestValidator.equals(
    "product weight matches input",
    createdProduct.weight,
    productData.weight,
  );
  TestValidator.equals(
    "product weight unit matches input",
    createdProduct.weight_unit,
    productData.weight_unit,
  );
  TestValidator.equals(
    "product track quantity matches input",
    createdProduct.track_quantity,
    productData.track_quantity,
  );
  TestValidator.equals(
    "product allow backorder matches input",
    createdProduct.allow_backorder,
    productData.allow_backorder,
  );
  TestValidator.equals(
    "product is shipping required matches input",
    createdProduct.is_shipping_required,
    productData.is_shipping_required,
  );
  TestValidator.equals(
    "product is taxable matches input",
    createdProduct.is_taxable,
    productData.is_taxable,
  );
  TestValidator.equals(
    "product category ID matches input",
    createdProduct.category.id,
    categoryId,
  );
  TestValidator.equals(
    "product SEO title matches input",
    createdProduct.seo_title,
    productData.seo_title,
  );
  TestValidator.equals(
    "product SEO description matches input",
    createdProduct.seo_description,
    productData.seo_description,
  );
  TestValidator.equals(
    "product tags match input",
    createdProduct.tags,
    productData.tags,
  );
  TestValidator.equals(
    "product featured image matches input",
    createdProduct.featured_image,
    productData.featured_image,
  );
  TestValidator.equals(
    "product compare price matches input",
    createdProduct.compare_at_price,
    productData.compare_at_price,
  );
  TestValidator.equals(
    "product cost matches input",
    createdProduct.cost,
    productData.cost,
  );
  TestValidator.equals(
    "product barcode matches input",
    createdProduct.barcode,
    productData.barcode,
  );

  // Step 6: Verify system-generated fields and catalog status
  TestValidator.predicate(
    "product has valid UUID ID",
    createdProduct.id.length === 36,
  );
  TestValidator.predicate(
    "product ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdProduct.id,
    ),
  );
  TestValidator.equals(
    "product status defaults to active",
    createdProduct.status,
    "active",
  );
  TestValidator.predicate(
    "product has creation timestamp",
    createdProduct.created_at.length > 0,
  );
  TestValidator.predicate(
    "product has update timestamp",
    createdProduct.updated_at.length > 0,
  );
  TestValidator.predicate(
    "product timestamps are ISO format",
    createdProduct.created_at.includes("T") &&
      createdProduct.updated_at.includes("T"),
  );
  TestValidator.predicate(
    "product has valid seller summary",
    createdProduct.seller.business_name.length > 0,
  );
  TestValidator.predicate(
    "product has category summary",
    createdProduct.category.name.length > 0,
  );
  TestValidator.predicate(
    "product has inventory status object",
    typeof createdProduct.inventory_status === "object",
  );
  TestValidator.predicate(
    "product has review statistics object",
    typeof createdProduct.reviews === "object",
  );
  TestValidator.predicate(
    "product variants array exists",
    Array.isArray(createdProduct.variants),
  );
  TestValidator.predicate(
    "product images array exists",
    Array.isArray(createdProduct.images),
  );
  TestValidator.equals(
    "product variants count is 0 initially",
    createdProduct.variants.length,
    0,
  );
  TestValidator.equals(
    "product images count is 0 initially",
    createdProduct.images.length,
    0,
  );

  // Step 7: Validate business logic compliance
  TestValidator.predicate(
    "product price is positive",
    createdProduct.price > 0,
  );
  TestValidator.predicate(
    "product compare price is higher than price",
    createdProduct.compare_at_price! > createdProduct.price,
  );
  TestValidator.predicate(
    "product cost is less than price for profit margin",
    createdProduct.cost! < createdProduct.price,
  );
  TestValidator.predicate(
    "product weight is positive",
    createdProduct.weight! > 0,
  );
  TestValidator.predicate(
    "product seller is owner",
    createdProduct.seller.id === seller.id,
  );
  TestValidator.predicate(
    "product is verified by seller",
    createdProduct.seller.is_verified === seller.is_verified,
  );
  TestValidator.predicate(
    "product commission rate matches seller",
    createdProduct.seller.commission_rate === seller.commission_rate,
  );
}
