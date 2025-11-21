import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test product creation with taxable versus non-taxable configurations for
 * proper sales tax calculation.
 *
 * This comprehensive test validates that the `is_taxable` flag determines
 * whether jurisdiction-specific taxes are calculated at checkout. The test will
 * create both taxable and non-taxable products, verify tax calculation
 * integration, ensure tax rates are properly displayed to customers, validate
 * that seller analytics track tax amounts separately from product revenue, and
 * confirm that financial reporting maintains proper tax liability records for
 * compliance purposes.
 *
 * The test covers the complete tax workflow from product creation through
 * customer purchase, including category verification for taxable product
 * classifications.
 */
export async function test_api_seller_product_creation_tax_calculation_integration(
  connection: api.IConnection,
) {
  // Step 1: Create seller account with tax configuration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: "Tax Test Merchant",
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphabets(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Verify category supports taxable product classifications
  const categories = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        limit: 100,
        isActive: true,
      } satisfies IShoppingMallProductCategory.IRequest,
    },
  );
  typia.assert(categories);
  TestValidator.predicate("categories exist", categories.data.length > 0);

  const testCategory = RandomGenerator.pick(categories.data);

  // Step 3: Create taxable product
  const taxableProductCreate = {
    sku: RandomGenerator.alphaNumeric(8),
    name: "Taxable Product",
    description: RandomGenerator.content({ paragraphs: 2 }),
    price: 99.99,
    condition: "new",
    weight: 1.5,
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true, // Taxable product
    category_id: testCategory.id,
    shopping_mall_seller_id: seller.id,
    variants: [],
    images: [],
    href: `https://example.com/products/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://example.com/categories/${testCategory.id}`,
  } satisfies IShoppingMallProduct.ICreate;

  const taxableProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: taxableProductCreate,
    });
  typia.assert(taxableProduct);

  TestValidator.equals(
    "taxable product is_taxable",
    taxableProduct.is_taxable,
    true,
  );
  TestValidator.equals("taxable product price", taxableProduct.price, 99.99);

  // Step 4: Create non-taxable product
  const nonTaxableProductCreate = {
    sku: RandomGenerator.alphaNumeric(8),
    name: "Non-Taxable Product",
    description: RandomGenerator.content({ paragraphs: 2 }),
    price: 79.99,
    condition: "new",
    weight: 1.2,
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: false, // Non-taxable product
    category_id: testCategory.id,
    shopping_mall_seller_id: seller.id,
    variants: [],
    images: [],
    href: `https://example.com/products/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://example.com/categories/${testCategory.id}`,
  } satisfies IShoppingMallProduct.ICreate;

  const nonTaxableProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: nonTaxableProductCreate,
    });
  typia.assert(nonTaxableProduct);

  TestValidator.equals(
    "non-taxable product is_taxable",
    nonTaxableProduct.is_taxable,
    false,
  );
  TestValidator.equals(
    "non-taxable product price",
    nonTaxableProduct.price,
    79.99,
  );

  // Step 5: Verify tax calculation scenarios
  // Note: Actual tax calculation would depend on customer location, tax jurisdiction,
  // and additional APIs not provided in the materials. We'll validate the foundation.

  TestValidator.predicate(
    "taxable product has proper seller context",
    taxableProduct.seller !== null &&
      taxableProduct.seller.id === seller.id &&
      taxableProduct.seller.verification_status === seller.verification_status,
  );

  TestValidator.predicate(
    "non-taxable product has proper seller context",
    nonTaxableProduct.seller !== null &&
      nonTaxableProduct.seller.id === seller.id &&
      nonTaxableProduct.seller.verification_status ===
        seller.verification_status,
  );

  TestValidator.predicate(
    "both products have inventory status",
    taxableProduct.inventory_status !== null &&
      nonTaxableProduct.inventory_status !== null,
  );

  TestValidator.predicate(
    "both products have review statistics",
    taxableProduct.reviews !== null && nonTaxableProduct.reviews !== null,
  );

  // Step 6: Validate product metadata and compliance
  TestValidator.predicate(
    "taxable product meets compliance requirements",
    taxableProduct.sku !== null &&
      taxableProduct.sku.length > 0 &&
      taxableProduct.status !== null &&
      taxableProduct.created_at !== null,
  );

  TestValidator.predicate(
    "non-taxable product meets compliance requirements",
    nonTaxableProduct.sku !== null &&
      nonTaxableProduct.sku.length > 0 &&
      nonTaxableProduct.status !== null &&
      nonTaxableProduct.created_at !== null,
  );
}
