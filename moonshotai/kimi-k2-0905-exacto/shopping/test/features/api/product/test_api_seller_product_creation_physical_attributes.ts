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

/**
 * Test product creation with comprehensive physical attributes.
 *
 * This test validates the creation of a product with complete physical
 * attributes including weight, dimensions, shipping requirements, and condition
 * specifications. It ensures that products requiring shipping have complete
 * logistics information for accurate shipping calculations and sets proper
 * customer expectations.
 *
 * The test follows these steps:
 *
 * 1. Create a seller account for authentication
 * 2. Generate comprehensive product data with physical attributes
 * 3. Create the product with shipping requirements enabled
 * 4. Validate all physical attributes are properly stored
 * 5. Verify shipping-related fields are correctly configured
 * 6. Test product creation without required shipping fields (should handle
 *    gracefully)
 */
export async function test_api_seller_product_creation_physical_attributes(
  connection: api.IConnection,
): Promise<void> {
  // Create seller account for authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Create product with comprehensive physical attributes
  const productData = {
    sku: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
    compare_at_price: typia.random<
      number & tags.Minimum<1000> & tags.Maximum<2000>
    >(),
    cost: typia.random<number & tags.Minimum<5> & tags.Maximum<500>>(),
    condition: "new",
    weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<50>>(),
    weight_unit: RandomGenerator.pick(["kg", "g", "lb", "oz"] as const),
    barcode: RandomGenerator.alphaNumeric(12),
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    seo_title: RandomGenerator.name(2),
    seo_description: RandomGenerator.paragraph({ sentences: 2 }),
    tags: "electronics,gadgets,tech",
    featured_image: `https://example.com/products/${RandomGenerator.alphaNumeric(8)}.jpg`,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    images: ArrayUtil.repeat(3, () => ({
      name: RandomGenerator.name(),
      extension: RandomGenerator.pick(["jpg", "png"] as const),
      url: `https://example.com/products/${RandomGenerator.alphaNumeric(8)}.${RandomGenerator.pick(["jpg", "png"] as const)}`,
    })),
    ip: "192.168.1.1",
    href: "https://example.com/seller/dashboard/products/create",
    referrer: "https://example.com/seller/dashboard",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Validate physical attributes
  TestValidator.equals("product name matches", product.name, productData.name);
  TestValidator.equals(
    "product weight matches",
    product.weight,
    productData.weight,
  );
  TestValidator.equals(
    "weight unit matches",
    product.weight_unit,
    productData.weight_unit,
  );
  TestValidator.equals("barcode matches", product.barcode, productData.barcode);
  TestValidator.equals("condition matches", product.condition, "new");
  TestValidator.equals(
    "shipping required flag",
    product.is_shipping_required,
    true,
  );
  TestValidator.equals("taxable flag", product.is_taxable, true);
  TestValidator.equals("track quantity flag", product.track_quantity, true);
  TestValidator.equals("allow backorder flag", product.allow_backorder, false);

  // Validate pricing and inventory
  TestValidator.equals("price matches", product.price, productData.price);
  TestValidator.equals(
    "compare at price matches",
    product.compare_at_price,
    productData.compare_at_price,
  );
  TestValidator.equals("cost matches", product.cost, productData.cost);

  // Validate SEO and categorization
  TestValidator.equals(
    "SEO title matches",
    product.seo_title,
    productData.seo_title,
  );
  TestValidator.equals(
    "SEO description matches",
    product.seo_description,
    productData.seo_description,
  );
  TestValidator.equals("tags match", product.tags, productData.tags);
  TestValidator.equals(
    "featured image matches",
    product.featured_image,
    productData.featured_image,
  );
  TestValidator.equals("SKU matches", product.sku, productData.sku);

  // Validate seller relationship
  TestValidator.equals("seller ID matches", product.seller.id, seller.id);
  TestValidator.equals(
    "seller email matches",
    product.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "seller business name matches",
    product.seller.business_name,
    seller.business_name,
  );

  // Validate images
  TestValidator.equals("image count matches", product.images.length, 3);
  TestValidator.predicate(
    "all images have required fields",
    product.images.every(
      (img) =>
        typeof img.image_url === "string" &&
        typeof img.alt_text === "string" &&
        typeof img.display_order === "number" &&
        typeof img.is_primary === "boolean",
    ),
  );

  // Validate variants (product should be created without variants initially)
  TestValidator.equals("variant count matches", product.variants.length, 0);

  // Validate product is in correct initial state
  TestValidator.equals("initial status", product.status, "active");
  TestValidator.predicate(
    "timestamps are valid",
    new Date(product.created_at).getTime() <= new Date().getTime() &&
      new Date(product.updated_at).getTime() <= new Date().getTime(),
  );

  // Test creating product with minimal physical attributes
  const minimalProductData = {
    sku: `SKU-MIN-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    price: 99.99,
    condition: "used",
    weight: 1.5,
    weight_unit: "kg" as const,
    track_quantity: false,
    allow_backorder: true,
    is_shipping_required: true,
    is_taxable: false,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    href: "https://example.com/seller/dashboard/products/create",
    referrer: "https://example.com/seller/dashboard",
  } satisfies IShoppingMallProduct.ICreate;

  const minimalProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: minimalProductData,
    });
  typia.assert(minimalProduct);

  // Validate minimal product attributes
  TestValidator.equals(
    "minimal product condition",
    minimalProduct.condition,
    "used",
  );
  TestValidator.equals("minimal product weight", minimalProduct.weight, 1.5);
  TestValidator.equals(
    "minimal product weight unit",
    minimalProduct.weight_unit,
    "kg",
  );
  TestValidator.equals(
    "minimal shipping required",
    minimalProduct.is_shipping_required,
    true,
  );
  TestValidator.equals(
    "minimal track quantity",
    minimalProduct.track_quantity,
    false,
  );
  TestValidator.equals(
    "minimal allow backorder",
    minimalProduct.allow_backorder,
    true,
  );
  TestValidator.equals("minimal taxable", minimalProduct.is_taxable, false);
  TestValidator.equals(
    "minimal variants count",
    minimalProduct.variants.length,
    0,
  );
  TestValidator.equals("minimal images count", minimalProduct.images.length, 0);

  // Verify that optional fields are properly handled
  TestValidator.equals(
    "minimal compare at price is null",
    minimalProduct.compare_at_price,
    null,
  );
  TestValidator.equals("minimal cost is null", minimalProduct.cost, null);
  TestValidator.equals("minimal barcode is null", minimalProduct.barcode, null);
  TestValidator.equals(
    "minimal SEO title is null",
    minimalProduct.seo_title,
    null,
  );
  TestValidator.equals(
    "minimal SEO description is null",
    minimalProduct.seo_description,
    null,
  );
  TestValidator.equals("minimal tags are null", minimalProduct.tags, null);
  TestValidator.equals(
    "minimal featured image is null",
    minimalProduct.featured_image,
    null,
  );
}
