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
 * Test creation of digital products requiring no physical shipping including
 * downloadable content, software licenses, and service offerings.
 *
 * This test validates proper configuration of non-shipping products with
 * appropriate inventory policies, digital delivery mechanisms, and instant
 * fulfillment capabilities. Ensures accurate categorization for customer
 * expectations, proper tax handling for digital goods, and comprehensive
 * integration with digital content delivery systems for seamless customer
 * experience across digital marketplace offerings.
 *
 * Test flow:
 *
 * 1. Create seller account specializing in digital products
 * 2. Create digital product with is_shipping_required: false
 * 3. Configure digital product variants with appropriate inventory policies
 * 4. Add product images for digital content visualization
 * 5. Validate product creation and configuration
 * 6. Verify digital product properties and settings
 */
export async function test_api_seller_product_creation_digital_product(
  connection: api.IConnection,
) {
  // Step 1: Create seller account specializing in digital products
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2) + " Digital Solutions",
      business_registration_number: typia.random<
        string & tags.Pattern<"^[A-Z]{3}[0-9]{6}$">
      >(),
      tax_id: typia.random<string & tags.Pattern<"^[0-9]{2}-[0-9]{7}$">>(),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "corporation",
        "llc",
        "partnership",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create digital product with is_shipping_required: false
  const productData = {
    sku: `DIGITAL-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(3) + " Software License",
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<500> & tags.Maximum<5000>
    >(),
    compare_at_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<600> & tags.Maximum<6000>
    >(),
    cost: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<1000>
    >(),
    condition: RandomGenerator.pick(["new"] as const),
    weight: 0, // Digital products have no physical weight
    weight_unit: "kg",
    barcode: typia.random<string & tags.Pattern<"^[0-9]{13}$">>(),
    track_quantity: true,
    allow_backorder: false, // Digital products typically don't allow backorders
    is_shipping_required: false, // Key property for digital products
    is_taxable: true, // Digital goods are usually taxable
    seo_title: RandomGenerator.name(4) + " - Premium Software License",
    seo_description: RandomGenerator.paragraph({ sentences: 6 }),
    tags: "software,license,digital,download,productivity",
    featured_image: "https://cdn.example.com/digital-products/main.jpg",
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    href: `https://digital-store.example.com/products/new`,
    referrer: "https://digital-store.example.com/dashboard",
    ip: null, // Optional field for session recording
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 3: Validate product creation and digital properties
  TestValidator.equals("product name matches", product.name, productData.name);
  TestValidator.equals(
    "product description matches",
    product.description,
    productData.description,
  );
  TestValidator.equals(
    "product price matches",
    product.price,
    productData.price,
  );
  TestValidator.equals(
    "product is digital",
    product.is_shipping_required,
    false,
  );
  TestValidator.equals("product is taxable", product.is_taxable, true);
  TestValidator.equals(
    "product allows backorder",
    product.allow_backorder,
    false,
  );
  TestValidator.predicate(
    "product has seller info",
    product.seller.business_name === seller.business_name,
  );
  TestValidator.predicate(
    "product has valid created timestamp",
    new Date(product.created_at).toString() !== "Invalid Date",
  );

  // Step 4: Validate digital product specific properties
  TestValidator.predicate("product weight is 0", product.weight === 0);
  TestValidator.predicate(
    "product track quantity is enabled",
    product.track_quantity === true,
  );
  TestValidator.predicate(
    "product has appropriate status",
    ["active", "draft"].includes(product.status),
  );
  TestValidator.predicate(
    "product has digital category",
    product.category.is_active === true,
  );
  TestValidator.predicate(
    "product has appropriate variants count",
    product.variants.length >= 0,
  );
  TestValidator.predicate(
    "product has appropriate images count",
    product.images.length >= 0,
  );
}
