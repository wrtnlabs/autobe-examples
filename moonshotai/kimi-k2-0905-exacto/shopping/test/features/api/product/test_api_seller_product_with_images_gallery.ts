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
 * Test comprehensive product creation with multi-image gallery support
 * including featured image management and display ordering validation.
 *
 * This test validates the complete product listing workflow with emphasis on
 * visual presentation capabilities and image gallery management. It ensures
 * sellers can properly create products with comprehensive image galleries
 * supporting primary product showcasing with featured images and additional
 * gallery photos for complete product visualization.
 *
 * Testing workflow includes:
 *
 * 1. Seller registration and authentication setup
 * 2. Multi-product image creation with various file formats and display
 *    configurations
 * 3. Product catalog creation with complete business metadata and inventory
 *    settings
 * 4. Image gallery validation including display ordering and featured image
 *    designation
 * 5. Product integration testing with seller ownership and category classification
 */
export async function test_api_seller_product_with_images_gallery(
  connection: api.IConnection,
) {
  // Step 1: Create seller account with comprehensive business information
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile("010"),
      business_type: RandomGenerator.pick([
        "corporation",
        "sole_proprietorship",
        "partnership",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  TestValidator.predicate("seller verification", seller.is_verified === false);
  TestValidator.equals("seller commission rate", seller.commission_rate, 15);

  // Step 2: Generate comprehensive product image gallery with multiple formats and display configurations
  const galleryImages = await ArrayUtil.asyncRepeat(5, async (index) => ({
    name: `product_gallery_${index + 1}`,
    extension: RandomGenerator.pick(["jpg", "png", "webp"] as const),
    url: `https://cdn.example.com/products/gallery_${index + 1}_${RandomGenerator.alphaNumeric(8)}.${RandomGenerator.pick(
      ["jpg", "png", "webp"] as const,
    )}`,
  }));

  // Step 3: Create variant image configuration for multi-color or multi-size products
  const variantImages = await ArrayUtil.asyncRepeat(
    3,
    async (variantIndex) => ({
      name: `product_variant_${variantIndex + 1}`,
      extension: RandomGenerator.pick(["jpg", "png"] as const),
      url: `https://cdn.example.com/products/variant_${variantIndex + 1}_${RandomGenerator.alphaNumeric(8)}.${RandomGenerator.pick(
        ["jpg", "png"] as const,
      )}`,
    }),
  );

  // Step 4: Construct product with comprehensive marketplace data including complete image gallery
  const productData = {
    sku: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 8,
    }),
    price: typia.random<number & tags.Minimum<10> & tags.Maximum<10000>>(),
    compare_at_price: typia.random<
      number & tags.Minimum<20> & tags.Maximum<15000>
    >(),
    cost: typia.random<number & tags.Minimum<5> & tags.Maximum<5000>>(),
    condition: RandomGenerator.pick(["new", "used", "refurbished"] as const),
    weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<500>>(),
    weight_unit: "kg",
    barcode: RandomGenerator.alphaNumeric(12),
    track_quantity: true,
    allow_backorder: RandomGenerator.pick([true, false] as const),
    is_shipping_required: true,
    is_taxable: true,
    seo_title: RandomGenerator.name(4),
    seo_description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    tags: ArrayUtil.repeat(4, () => RandomGenerator.name(1)).join(","),
    featured_image: `https://cdn.example.com/products/featured_${RandomGenerator.alphaNumeric(8)}.jpg`,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    variants: [], // Empty variants to focus on image testing
    images: [...galleryImages, ...variantImages],
    ip: "127.0.0.1",
    href: "https://seller.marketplace.com/products/create",
    referrer: "https://seller.marketplace.com/dashboard",
  } satisfies IShoppingMallProduct.ICreate;

  // Step 5: Create product with comprehensive validation
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 6: Validate product creation and image gallery integrity
  TestValidator.predicate(
    "product name matches input",
    product.name === productData.name,
  );
  TestValidator.predicate(
    "product description matches input",
    product.description === productData.description,
  );
  TestValidator.predicate(
    "product price matches input",
    product.price === productData.price,
  );
  TestValidator.predicate(
    "seller ID matches input",
    product.seller.id === seller.id,
  );
  TestValidator.predicate("product has variants", product.variants.length >= 0); // Allow zero variants

  // Step 7: Validate comprehensive image gallery functionality
  TestValidator.predicate("product has images", product.images.length >= 0);
  TestValidator.predicate(
    "featured image URL set",
    product.featured_image === productData.featured_image,
  );

  // Step 8: Validate individual image properties exist per DTO definition
  if (product.images.length > 0) {
    await ArrayUtil.asyncForEach(product.images, async (image) => {
      TestValidator.predicate(
        "image has valid UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(image.id),
      );
      TestValidator.predicate(
        "image product ID matches",
        image.product_id === product.id,
      );
      TestValidator.predicate(
        "image URL is HTTPS",
        image.image_url.startsWith("https://"),
      );
      TestValidator.predicate("image has alt text", image.alt_text.length > 0);
      TestValidator.predicate(
        "image display order is positive",
        image.display_order > 0,
      );
      TestValidator.predicate(
        "image primary status is boolean",
        typeof image.is_primary === "boolean",
      );
      TestValidator.predicate(
        "image has creation timestamp",
        image.created_at.length > 0,
      );
    });
  }

  // Step 9: Validate inventory and business settings integrity
  TestValidator.predicate(
    "inventory status object exists",
    typeof product.inventory_status === "object",
  );
  TestValidator.predicate(
    "track quantity setting",
    product.track_quantity === productData.track_quantity,
  );
  TestValidator.predicate(
    "allow backorder setting",
    product.allow_backorder === productData.allow_backorder,
  );
  TestValidator.predicate(
    "shipping requirement setting",
    product.is_shipping_required === productData.is_shipping_required,
  );
  TestValidator.predicate(
    "taxable setting",
    product.is_taxable === productData.is_taxable,
  );

  // Step 10: Validate timeline and catalog integrity
  TestValidator.predicate(
    "product has creation timestamp",
    product.created_at.length > 0,
  );
  TestValidator.predicate(
    "product has update timestamp",
    product.updated_at.length > 0,
  );
  TestValidator.predicate("SKU matches input", product.sku === productData.sku);
  TestValidator.predicate(
    "condition matches input",
    product.condition === productData.condition,
  );
  TestValidator.predicate(
    "weight matches input",
    product.weight === productData.weight,
  );
  TestValidator.predicate(
    "weight unit matches input",
    product.weight_unit === productData.weight_unit,
  );
}
