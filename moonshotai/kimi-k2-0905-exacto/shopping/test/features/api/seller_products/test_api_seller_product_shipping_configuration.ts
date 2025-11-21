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
 * Test seller creating a product with specific shipping requirements and weight
 * configuration. Validates shipping settings for accurate delivery cost
 * calculations and logistics planning.
 *
 * 1. Create seller account through seller registration
 * 2. Create product with comprehensive shipping configuration
 * 3. Validate all shipping-related fields are properly set
 * 4. Verify weight and dimensional data for shipping calculations
 * 5. Ensure inventory and shipping policies are correctly configured
 */
export async function test_api_seller_product_shipping_configuration(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    },
  });
  typia.assert(seller);

  // Step 2: Create product with shipping configuration
  const productWeight = typia.random<
    number & tags.Minimum<0.1> & tags.Maximum<50>
  >();
  const productPrice = typia.random<
    number & tags.Minimum<10> & tags.Maximum<1000>
  >();

  const createProductBody = {
    sku: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 2 }),
    price: productPrice,
    compare_at_price:
      productPrice +
      typia.random<number & tags.Minimum<5> & tags.Maximum<200>>(),
    cost:
      productPrice -
      typia.random<number & tags.Minimum<1> & tags.Maximum<50>>(),
    condition: RandomGenerator.pick(["new", "used", "refurbished"] as const),
    weight: productWeight,
    weight_unit: RandomGenerator.pick(["kg", "g", "lb", "oz"] as const),
    barcode: RandomGenerator.alphaNumeric(13),
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    seo_title: RandomGenerator.paragraph({ sentences: 1 }),
    seo_description: RandomGenerator.paragraph({ sentences: 2 }),
    tags: ["electronics", "gadget", "shipping"].join(","),
    featured_image: `https://example.com/product/${RandomGenerator.alphaNumeric(8)}.jpg`,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    href: "https://shopping-mall.example.com/products/new",
    referrer: "https://shopping-mall.example.com/dashboard/products",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: createProductBody,
    },
  );
  typia.assert(product);

  // Step 3: Validate shipping configuration
  TestValidator.equals(
    "product SKU matches",
    product.sku,
    createProductBody.sku,
  );
  TestValidator.equals(
    "product name matches",
    product.name,
    createProductBody.name,
  );
  TestValidator.equals(
    "product weight matches",
    product.weight,
    createProductBody.weight,
  );
  TestValidator.equals(
    "weight unit matches",
    product.weight_unit,
    createProductBody.weight_unit,
  );
  TestValidator.equals(
    "shipping required flag matches",
    product.is_shipping_required,
    createProductBody.is_shipping_required,
  );
  TestValidator.equals(
    "tracking quantity matches",
    product.track_quantity,
    createProductBody.track_quantity,
  );
  TestValidator.equals(
    "backorder policy matches",
    product.allow_backorder,
    createProductBody.allow_backorder,
  );
  TestValidator.equals(
    "taxable flag matches",
    product.is_taxable,
    createProductBody.is_taxable,
  );
  TestValidator.equals(
    "product condition matches",
    product.condition,
    createProductBody.condition,
  );

  // Step 4: Validate price and cost information for shipping calculations
  TestValidator.equals(
    "product price set correctly",
    product.price,
    createProductBody.price,
  );
  TestValidator.equals(
    "compare at price set correctly",
    product.compare_at_price,
    createProductBody.compare_at_price,
  );
  TestValidator.equals(
    "cost set correctly for margin calculations",
    product.cost,
    createProductBody.cost,
  );

  // Step 5: Validate SEO and categorization
  TestValidator.equals(
    "SEO title matches",
    product.seo_title,
    createProductBody.seo_title,
  );
  TestValidator.equals(
    "SEO description matches",
    product.seo_description,
    createProductBody.seo_description,
  );
  TestValidator.equals("tags match", product.tags, createProductBody.tags);
  TestValidator.equals(
    "featured image matches",
    product.featured_image,
    createProductBody.featured_image,
  );

  // Step 6: Validate seller and category relationships
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

  // Step 7: Validate product status and metadata
  TestValidator.predicate(
    "product has valid ID",
    typia.is<string & tags.Format<"uuid">>(product.id),
  );
  TestValidator.predicate(
    "product has valid created timestamp",
    typia.is<string & tags.Format<"date-time">>(product.created_at),
  );
  TestValidator.predicate(
    "product has valid updated timestamp",
    typia.is<string & tags.Format<"date-time">>(product.updated_at),
  );
  TestValidator.equals(
    "product status is draft by default",
    product.status,
    "draft",
  );

  // Step 8: Validate inventory and review statistics
  TestValidator.predicate(
    "inventory status exists",
    product.inventory_status !== undefined,
  );
  TestValidator.predicate(
    "review statistics exist",
    product.reviews !== undefined,
  );
  TestValidator.equals(
    "variants array initialized",
    product.variants.length,
    0,
  );
  TestValidator.equals("images array initialized", product.images.length, 0);
  TestValidator.equals("reviews count initialized", product.reviews_count, 0);
  TestValidator.equals("variants count initialized", product.variants_count, 0);
}
