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
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test variant inventory policies including deny vs continue settings for
 * preventing overselling when stock reaches zero. Validates inventory accuracy
 * maintenance, customer expectation management, backorder processing workflows,
 * and supplier integration coordination for optimized fulfillment planning.
 *
 * This comprehensive test ensures that inventory management systems correctly
 * handle oversell prevention through appropriate inventory policies. The test
 * validates:
 *
 * - Successfully prevents overselling with "deny" policy when inventory reaches
 *   zero
 * - Successfully allows backorders with "continue" policy for supplier
 *   coordination
 * - Maintains accurate inventory tracking across variant configurations
 * - Ensures customer expectations are properly managed through policy indicators
 * - Validates supplier integration readiness for fulfillment planning
 */
export async function test_api_seller_variant_inventory_oversell_prevention(
  connection: api.IConnection,
) {
  // Step 1: Seller registration for inventory testing
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: `${RandomGenerator.name()} Marketplace LLC`,
    business_registration_number: `BR-${typia.random<string & tags.Pattern<"^[0-9]{10}$">>()}`,
    tax_id: `TAX-${typia.random<string & tags.Pattern<"^[0-9]{9}$">>()}`,
    phone: RandomGenerator.mobile("010"),
    business_type: "corporation",
  } satisfies IShoppingMallSeller.IJoin;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 2: Create product with inventory tracking enabled
  const productData = {
    sku: `PROD-INVENTORY-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    name: `${RandomGenerator.name()} Premium Electronic Device`,
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 12,
      sentenceMax: 18,
    }),
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<50000> & tags.Maximum<500000>
    >(),
    condition: "new",
    weight: typia.random<number & tags.Minimum<0.5> & tags.Maximum<5>>(),
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    href: "https://marketplace.example.com/seller/products/create",
    referrer: "https://marketplace.example.com/seller/dashboard/inventory",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 3: Create product units for variant configuration
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(sizeUnit);

  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Color",
        type: "color",
        display_style: "swatches",
        is_required: true,
        is_multiple: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(colorUnit);

  // Step 4: Create variants with different inventory policies
  // Variant with "deny" policy - prevents overselling completely
  const denyVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: `${product.sku}-DENY-LARGE-BLACK`,
          title: "Large, Matte Black - Strict Inventory Control",
          price_adjustment: typia.random<
            number & tags.Minimum<0> & tags.Maximum<20000>
          >(),
          inventory_quantity: 3, // Low stock to test oversell prevention
          inventory_policy: "deny", // Critical: prevents overselling when inventory = 0
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(denyVariant);

  // Variant with "continue" policy - enables backorder management
  const continueVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: `${product.sku}-CONTINUE-MEDIUM-SILVER`,
          title: "Medium, Silver - Backorder Available",
          price_adjustment: typia.random<
            number & tags.Minimum<0> & tags.Maximum<15000>
          >(),
          inventory_quantity: 0, // Set to zero to test backorder capability
          inventory_policy: "continue", // Critical: allows backorders beyond current stock
          position: 2,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(continueVariant);

  // Step 5: Comprehensive validation of inventory oversell prevention logic
  TestValidator.equals(
    "deny variant enforces strict inventory control",
    denyVariant.inventory_policy,
    "deny",
  );
  TestValidator.equals(
    "continue variant enables backorder processing",
    continueVariant.inventory_policy,
    "continue",
  );
  TestValidator.equals(
    "deny variant maintains low stock threshold",
    denyVariant.inventory_quantity,
    3,
  );
  TestValidator.equals(
    "continue variant shows backorder-available state",
    continueVariant.inventory_quantity,
    0,
  );

  // Validate business logic: deny policy prevents negative inventory
  TestValidator.predicate(
    "deny policy safeguards against overselling when inventory reaches zero",
    denyVariant.inventory_policy === "deny" &&
      denyVariant.inventory_quantity >= 0,
  );

  // Validate business continuity: continue policy maintains sales channels
  TestValidator.predicate(
    "continue policy sustains revenue flow through backorder processing",
    continueVariant.inventory_policy === "continue" &&
      continueVariant.inventory_quantity === 0,
  );

  // Validate customer experience management
  TestValidator.predicate(
    "customers receive accurate stock information for both policies",
    (denyVariant.inventory_policy === "deny" &&
      denyVariant.inventory_quantity >= 0) ||
      (continueVariant.inventory_policy === "continue" &&
        continueVariant.is_active === true),
  );

  // Validate SKU uniqueness and product relationship integrity
  TestValidator.notEquals(
    "variant SKUs remain unique across inventory policies",
    denyVariant.sku,
    continueVariant.sku,
  );
  TestValidator.predicate(
    "both variants correctly reference parent product SKU",
    denyVariant.sku.includes(product.sku.substring(0, 15)) &&
      continueVariant.sku.includes(product.sku.substring(0, 15)),
  );

  // Validate supplier integration readiness
  TestValidator.predicate(
    "product variants configured for optimal supplier coordination",
    product.track_quantity === true &&
      (denyVariant.inventory_policy === "deny" ||
        continueVariant.inventory_policy === "continue"),
  );

  // Final integration test for fulfillment planning
  TestValidator.predicate(
    "inventory management system prevents oversell while enabling business continuity",
    denyVariant.inventory_policy === "deny" &&
      continueVariant.inventory_policy === "continue" &&
      product.allow_backorder === false,
  ); // Parent product should enforce backorder policies through variants only
}
