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
 * Test basic product creation by authenticated seller to establish marketplace
 * catalog foundation.
 *
 * Validates comprehensive product information capture including unique SKU
 * assignment, descriptive content creation, competitive pricing setup, proper
 * category assignment, and seller ownership relationships. Test ensures
 * products support inventory management workflows and establish proper
 * lifecycle states for marketplace operations.
 */
export async function test_api_seller_product_creation_basic_listing(
  connection: api.IConnection,
) {
  // Register seller account for product creation
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "sole_proprietorship",
        "corporation",
        "llc",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Create realistic product with valid data
  const productData = {
    sku: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    name: `${RandomGenerator.name()} ${RandomGenerator.pick(["Electronics", "Clothing", "Home", "Sports", "Books"] as const)}`,
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
    compare_at_price: typia.random<
      number & tags.Minimum<10> & tags.Maximum<1500>
    >(),
    cost: typia.random<number & tags.Minimum<5> & tags.Maximum<500>>(),
    condition: RandomGenerator.pick(["new", "used", "refurbished"] as const),
    weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
    weight_unit: "kg",
    barcode: RandomGenerator.alphaNumeric(13),
    track_quantity: true,
    allow_backorder: RandomGenerator.pick([true, false]),
    is_shipping_required: true,
    is_taxable: true,
    seo_title: RandomGenerator.paragraph({ sentences: 5 }),
    seo_description: RandomGenerator.paragraph({ sentences: 3 }),
    tags: `${RandomGenerator.name()}, ${RandomGenerator.pick(["premium", "eco-friendly", "innovative", "budget"] as const)}, ${RandomGenerator.pick(["popular", "exclusive", "limited"] as const)}`,
    featured_image: `https://example.com/images/${RandomGenerator.alphaNumeric(10)}.jpg`,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    href: "https://marketplace.example.com/seller/products/new",
    referrer: "https://marketplace.example.com/seller/dashboard",
  } satisfies IShoppingMallProduct.ICreate;

  // Create product via API
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Validate product creation results
  TestValidator.equals("product name matches", product.name, productData.name);
  TestValidator.equals(
    "product price matches",
    product.price,
    productData.price,
  );
  TestValidator.equals("product SKU matches", product.sku, productData.sku);
  TestValidator.equals(
    "product condition matches",
    product.condition,
    productData.condition,
  );
  TestValidator.equals(
    "seller relationship established",
    product.seller.id,
    seller.id,
  );
  TestValidator.predicate(
    "product has valid ID",
    product.id !== null && product.id !== undefined,
  );
  TestValidator.predicate(
    "product is in draft status",
    product.status === "draft",
  );
  TestValidator.predicate(
    "product has description",
    product.description !== null && product.description !== undefined,
  );
  TestValidator.predicate(
    "product has weight",
    product.weight !== null && product.weight !== undefined,
  );
  TestValidator.predicate(
    "product has barcode",
    product.barcode !== null && product.barcode !== undefined,
  );
  TestValidator.predicate(
    "SEO title present",
    product.seo_title !== null && product.seo_title !== undefined,
  );
  TestValidator.predicate(
    "SEO description present",
    product.seo_description !== null && product.seo_description !== undefined,
  );
  TestValidator.predicate(
    "tags present",
    product.tags !== null && product.tags !== undefined,
  );
  TestValidator.predicate(
    "featured image set",
    product.featured_image !== null && product.featured_image !== undefined,
  );
  TestValidator.predicate(
    "inventory tracking enabled",
    product.track_quantity === productData.track_quantity,
  );
  TestValidator.predicate(
    "shipping requirements set",
    product.is_shipping_required === productData.is_shipping_required,
  );
  TestValidator.predicate(
    "tax configuration matches",
    product.is_taxable === productData.is_taxable,
  );
  TestValidator.predicate(
    "backorder policy matches",
    product.allow_backorder === productData.allow_backorder,
  );
  TestValidator.predicate(
    "compare price higher than price",
    (product.compare_at_price ?? 0) >= product.price,
  );
  TestValidator.predicate(
    "cost lower than price",
    (product.cost ?? 0) < product.price,
  );
  TestValidator.predicate(
    "category assigned",
    product.category !== null && product.category !== undefined,
  );
  TestValidator.predicate(
    "category ID matches",
    product.category.id === productData.category_id,
  );
  TestValidator.predicate(
    "seller info present",
    product.seller !== null && product.seller !== undefined,
  );
  TestValidator.equals(
    "seller name matches",
    product.seller.business_name,
    seller.business_name,
  );
  TestValidator.predicate(
    "creation timestamp present",
    product.created_at !== null && product.created_at !== undefined,
  );
  TestValidator.predicate(
    "update timestamp present",
    product.updated_at !== null && product.updated_at !== undefined,
  );
  TestValidator.predicate(
    "published date null for draft",
    product.published_at === null || product.published_at === undefined,
  );
  TestValidator.predicate(
    "deleted date null",
    product.deleted_at === null || product.deleted_at === undefined,
  );
}
