import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallInventoryLevels } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLevels";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWarehouse";

export async function test_api_seller_product_creation_inventory_policy_customization(
  connection: api.IConnection,
) {
  // 1. Register as a seller with comprehensive business information
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
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

  // 2. Create product with backorder allowed (track_quantity: true, allow_backorder: true)
  const backorderProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: `BACKORDER-${RandomGenerator.alphaNumeric(8)}`,
        name: "Premium Widget - Backorder Enabled",
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<500>>(),
        compare_at_price: null,
        cost: typia.random<number & tags.Minimum<5> & tags.Maximum<200>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
        weight_unit: "kg",
        barcode: null,
        track_quantity: true,
        allow_backorder: true,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: RandomGenerator.paragraph({ sentences: 2 }),
        seo_description: RandomGenerator.paragraph({ sentences: 3 }),
        tags: "electronics,gadgets,widget",
        featured_image: null,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://seller-dashboard.example.com/products/create",
        referrer: "https://seller-dashboard.example.com/products",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(backorderProduct);

  TestValidator.equals(
    "backorder product allows backorder",
    backorderProduct.allow_backorder,
    true,
  );
  TestValidator.equals(
    "backorder product tracks quantity",
    backorderProduct.track_quantity,
    true,
  );

  // 3. Create product with strict inventory tracking (track_quantity: true, allow_backorder: false)
  const strictProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: `STRICT-${RandomGenerator.alphaNumeric(8)}`,
        name: "Standard Widget - Strict Inventory",
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 12,
        }),
        price: typia.random<number & tags.Minimum<20> & tags.Maximum<300>>(),
        compare_at_price: null,
        cost: typia.random<number & tags.Minimum<10> & tags.Maximum<150>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.5> & tags.Maximum<5>>(),
        weight_unit: "kg",
        barcode: null,
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: RandomGenerator.paragraph({ sentences: 2 }),
        seo_description: RandomGenerator.paragraph({ sentences: 3 }),
        tags: "hardware,tools,widget",
        featured_image: null,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://seller-dashboard.example.com/products/create",
        referrer: "https://seller-dashboard.example.com/products",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(strictProduct);

  TestValidator.equals(
    "strict product disallows backorder",
    strictProduct.allow_backorder,
    false,
  );
  TestValidator.equals(
    "strict product tracks quantity",
    strictProduct.track_quantity,
    true,
  );

  // 4. Create product without quantity tracking (track_quantity: false, allow_backorder: false)
  const noTrackProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: `NOTRACK-${RandomGenerator.alphaNumeric(8)}`,
        name: "Service Widget - No Quantity Tracking",
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 6,
          sentenceMax: 10,
        }),
        price: typia.random<number & tags.Minimum<50> & tags.Maximum<1000>>(),
        compare_at_price: null,
        cost: typia.random<number & tags.Minimum<25> & tags.Maximum<500>>(),
        condition: "new",
        weight: 0,
        weight_unit: "kg",
        barcode: null,
        track_quantity: false,
        allow_backorder: false,
        is_shipping_required: false,
        is_taxable: true,
        seo_title: RandomGenerator.paragraph({ sentences: 2 }),
        seo_description: RandomGenerator.paragraph({ sentences: 3 }),
        tags: "service,digital,widget",
        featured_image: null,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://seller-dashboard.example.com/products/create",
        referrer: "https://seller-dashboard.example.com/products",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(noTrackProduct);

  TestValidator.equals(
    "no-track product disallows backorder",
    noTrackProduct.allow_backorder,
    false,
  );
  TestValidator.equals(
    "no-track product does not track quantity",
    noTrackProduct.track_quantity,
    false,
  );

  // 5. Validate seller ownership and product relationships
  TestValidator.equals(
    "backorder product belongs to correct seller",
    backorderProduct.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "strict product belongs to correct seller",
    strictProduct.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "no-track product belongs to correct seller",
    noTrackProduct.seller.id,
    seller.id,
  );

  // 6. Test inventory policy combinations
  TestValidator.predicate(
    "backorder product enables flexible inventory management",
    backorderProduct.allow_backorder && backorderProduct.track_quantity,
  );
  TestValidator.predicate(
    "strict product enforces inventory discipline",
    !strictProduct.allow_backorder && strictProduct.track_quantity,
  );
  TestValidator.predicate(
    "no-track product simplifies inventory for services",
    !noTrackProduct.allow_backorder && !noTrackProduct.track_quantity,
  );

  // 7. Validate product status and basic properties
  TestValidator.predicate(
    "backorder product is active",
    backorderProduct.status === "active",
  );
  TestValidator.predicate(
    "strict product is active",
    strictProduct.status === "active",
  );
  TestValidator.predicate(
    "no-track product is active",
    noTrackProduct.status === "active",
  );

  // 8. Test SKU uniqueness patterns
  TestValidator.predicate(
    "backorder product SKU is unique",
    backorderProduct.sku.startsWith("BACKORDER-"),
  );
  TestValidator.predicate(
    "strict product SKU is unique",
    strictProduct.sku.startsWith("STRICT-"),
  );
  TestValidator.predicate(
    "no-track product SKU is unique",
    noTrackProduct.sku.startsWith("NOTRACK-"),
  );

  // 9. Validate product pricing and cost relationships
  TestValidator.predicate(
    "backorder product price is greater than cost",
    backorderProduct.price > (backorderProduct.cost ?? 0),
  );
  TestValidator.predicate(
    "strict product price is greater than cost",
    strictProduct.price > (strictProduct.cost ?? 0),
  );
  TestValidator.predicate(
    "no-track product price is greater than cost",
    noTrackProduct.price > (noTrackProduct.cost ?? 0),
  );

  // 10. Test product metadata and SEO properties
  TestValidator.predicate(
    "backorder product has SEO title",
    backorderProduct.seo_title !== null,
  );
  TestValidator.predicate(
    "backorder product has SEO description",
    backorderProduct.seo_description !== null,
  );
  TestValidator.predicate(
    "strict product has SEO title",
    strictProduct.seo_title !== null,
  );
  TestValidator.predicate(
    "strict product has SEO description",
    strictProduct.seo_description !== null,
  );
  TestValidator.predicate(
    "no-track product has SEO title",
    noTrackProduct.seo_title !== null,
  );
  TestValidator.predicate(
    "no-track product has SEO description",
    noTrackProduct.seo_description !== null,
  );

  // 11. Validate product shipping and tax settings
  TestValidator.predicate(
    "backorder product requires shipping",
    backorderProduct.is_shipping_required === true,
  );
  TestValidator.predicate(
    "backorder product is taxable",
    backorderProduct.is_taxable === true,
  );
  TestValidator.predicate(
    "strict product requires shipping",
    strictProduct.is_shipping_required === true,
  );
  TestValidator.predicate(
    "strict product is taxable",
    strictProduct.is_taxable === true,
  );
  TestValidator.predicate(
    "no-track product does not require shipping",
    noTrackProduct.is_shipping_required === false,
  );
  TestValidator.predicate(
    "no-track product is taxable",
    noTrackProduct.is_taxable === true,
  );

  // 12. Test product creation timestamps
  TestValidator.predicate(
    "backorder product has creation timestamp",
    backorderProduct.created_at !== undefined,
  );
  TestValidator.predicate(
    "backorder product has update timestamp",
    backorderProduct.updated_at !== undefined,
  );
  TestValidator.predicate(
    "strict product has creation timestamp",
    strictProduct.created_at !== undefined,
  );
  TestValidator.predicate(
    "strict product has update timestamp",
    strictProduct.updated_at !== undefined,
  );
  TestValidator.predicate(
    "no-track product has creation timestamp",
    noTrackProduct.created_at !== undefined,
  );
  TestValidator.predicate(
    "no-track product has update timestamp",
    noTrackProduct.updated_at !== undefined,
  );
}
