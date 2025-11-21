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

export async function test_api_seller_product_creation_multiple_images(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for product creation
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const businessName = RandomGenerator.name(2);
  const registrationNumber = RandomGenerator.alphaNumeric(10).toUpperCase();
  const taxId = RandomGenerator.alphaNumeric(9);
  const phoneNumber = RandomGenerator.mobile();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: businessName,
      business_registration_number: registrationNumber,
      tax_id: taxId,
      phone: phoneNumber,
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Authenticate seller for secure product creation
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "1234", // Default password from test examples
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 3: Create product with comprehensive image gallery
  const productSku = RandomGenerator.alphaNumeric(8).toUpperCase();
  const productName = RandomGenerator.name(3);
  const productDescription = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });

  // Generate multiple product images showcasing different aspects
  const productImages = ArrayUtil.repeat(5, (index) => ({
    name: `product_image_${index + 1}`,
    extension: "jpg",
    url: typia.random<string & tags.Format<"uri">>(),
  }));

  // Create product with multiple images and variants
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: productSku,
        name: productName,
        description: productDescription,
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        compare_at_price: typia.random<
          number & tags.Minimum<10> & tags.Maximum<2000>
        >(),
        cost: typia.random<number & tags.Minimum<5> & tags.Maximum<500>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
        weight_unit: "kg",
        barcode: RandomGenerator.alphaNumeric(12),
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: RandomGenerator.name(2),
        seo_description: RandomGenerator.paragraph({ sentences: 6 }),
        tags: "electronics,gadgets,featured",
        featured_image: productImages[0].url,
        category_id: "550e8400-e29b-41d4-a716-446655440000", // Mock category UUID
        shopping_mall_seller_id: seller.id,
        images: productImages,
        href: "https://mall.example.com/products/create",
        referrer: "https://mall.example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );

  typia.assert(product);

  // Step 4: Validate created product with comprehensive image gallery
  TestValidator.equals(
    "product has valid ID format",
    typeof product.id,
    "string",
  );
  TestValidator.equals("product SKU matches input", product.sku, productSku);
  TestValidator.equals("product name matches input", product.name, productName);
  TestValidator.predicate(
    "product has multiple images",
    product.images.length >= 5,
  );
  TestValidator.equals(
    "seller business name matches",
    product.seller.business_name,
    businessName,
  );

  // Validate image gallery configuration
  product.images.forEach((image, index) => {
    TestValidator.predicate(
      `image ${index + 1} has valid URL format`,
      image.image_url.startsWith("http") && image.image_url.includes(".jpg"),
    );
    TestValidator.equals(
      `image ${index + 1} has proper product ID`,
      image.product_id,
      product.id,
    );
    TestValidator.predicate(
      `image ${index + 1} has descriptive alt text`,
      image.alt_text.length > 0,
    );
  });

  // Validate display ordering
  TestValidator.predicate(
    "images have sequential display order",
    product.images.every((img, idx) => img.display_order === idx + 1),
  );

  // Validate business context
  TestValidator.equals("seller ID matches", product.seller.id, seller.id);
  TestValidator.predicate(
    "seller verification status",
    product.seller.is_verified,
  );

  // Validate product metadata
  TestValidator.predicate("price is positive", product.price > 0);
  TestValidator.predicate("condition is new", product.condition === "new");
  TestValidator.predicate(
    "status is valid",
    ["active", "draft", "archived"].includes(product.status),
  );
  TestValidator.predicate(
    "inventory tracking enabled",
    product.track_quantity === true,
  );
  TestValidator.predicate(
    "shipping required",
    product.is_shipping_required === true,
  );
  TestValidator.predicate("taxable product", product.is_taxable === true);
}
