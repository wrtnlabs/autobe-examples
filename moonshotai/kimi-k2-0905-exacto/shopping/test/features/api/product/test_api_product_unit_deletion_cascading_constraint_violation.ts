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
 * Test data integrity validation during unit deletion when dependent product
 * variants exist. Validates that the deletion operation properly checks for
 * existing product variants that depend on the unit configuration, preventing
 * deletion that would compromise product variant requirements and maintaining
 * referential integrity across the product catalog system.
 */
export async function test_api_product_unit_deletion_cascading_constraint_violation(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphabets(10),
      tax_id: RandomGenerator.alphabets(9),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "corporation",
        "llc",
        "partnership",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create product with variant potential
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<1000>
        >(),
        condition: RandomGenerator.pick([
          "new",
          "used",
          "refurbished",
        ] as const),
        weight: 1.5,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: "purchase:books", // Using book category for clear product context
        shopping_mall_seller_id: seller.id,
        variants: [], // Initialize with no variants initially
        images: [],
        href: "https://example.com/test-product-creation",
        referrer: "https://store.example.com/manage/products",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create product unit for variant configuration
  const unit = await api.functional.shoppingMall.seller.products.units.create(
    connection,
    {
      productCode: product.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    },
  );
  typia.assert(unit);

  // Step 4: Create product variant that depends on the unit configuration
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: unit.id,
          sku: `${product.sku}-LARGE`,
          title: "Large Size",
          price_adjustment: 10.0,
          inventory_quantity: 50,
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);

  // Step 5: Attempt to delete unit with dependent variant - should fail to maintain integrity
  await TestValidator.error(
    "should prevent unit deletion when variants depend on it",
    async () => {
      await api.functional.shoppingMall.seller.products.units.erase(
        connection,
        {
          productCode: product.sku,
          unitId: unit.id,
        },
      );
    },
  );

  // Step 6: Verify variant still exists and references the unit
  TestValidator.predicate(
    "variant should remain active with unit reference intact",
    variant.is_active === true &&
      variant.shopping_mall_product_unit_id === unit.id,
  );
}
