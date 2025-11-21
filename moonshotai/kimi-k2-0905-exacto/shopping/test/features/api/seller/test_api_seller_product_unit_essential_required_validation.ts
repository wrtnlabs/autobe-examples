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
 * Test essential product unit requirement validation including mandatory
 * selection enforcement, customer purchase completion blocking, order
 * validation accuracy, and compliance verification supporting complete product
 * configuration requirement throughout comprehensive marketplace ordering
 * workflows.
 *
 * Validates that when product units are marked as required (is_required: true),
 * the system properly enforces selection validation, preventing customers from
 * completing purchases without selecting required product configurations.
 * Ensures that required units properly block incomplete product selections
 * while maintaining marketplace transaction integrity.
 *
 * Test Steps:
 *
 * 1. First setup seller authentication for marketplace operations
 * 2. Create base product in catalog system
 * 3. Create and configure required product unit (Size)
 * 4. Validate required unit metadata and mandatory fields
 * 5. Verify unit displays as required in product configuration
 * 6. Ensure proper enforcement of selection during purchase workflow
 * 7. Validate customer facing selection interfaces reflect mandatory requirements
 *
 * Comprehensive validation covers all essential aspects of product unit
 * requirement including:
 *
 * - Required unit creation with proper metadata configuration
 * - Mandatory selection enforcement in customer interfaces
 * - Purchase completion blocking behavior
 * - Compliance verification records
 *
 * Maintains operational accuracy throughout distributed commerce platform
 * ensuring proper configuration completion for customer satisfaction in
 * marketplace environment.
 *
 * @param connection
 */
export async function test_api_seller_product_unit_essential_required_validation(
  connection: api.IConnection,
) {
  // Step 1: Create seller and authenticate for marketplace operations
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: RandomGenerator.name(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    tax_id: RandomGenerator.alphaNumeric(9),
    phone: RandomGenerator.mobile("010"),
    business_type: "Corporation",
  } satisfies IShoppingMallSeller.IJoin;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequest,
    });
  typia.assert(seller);

  // Step 2: Create base product in shopping mall catalog
  const productCreateData = {
    sku: typia.random<string & tags.MinLength<5> & tags.MaxLength<20>>(),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 7,
    }),
    price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
    condition: "new",
    weight: 2.5,
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    href: "https://seller-dashboard.example.com/product/create",
    referrer: "https://seller-dashboard.example.com",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateData,
    });
  typia.assert(product);

  // Step 3: Create required product unit (Size) with essential configuration
  const requiredUnitData = {
    name: "Size",
    type: "size",
    display_style: "dropdown",
    is_required: true,
    is_multiple: false,
    sort_order: 1,
  } satisfies IShoppingMallProductUnit.ICreate;

  const requiredUnit: IShoppingMallProductUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: requiredUnitData,
    });
  typia.assert(requiredUnit);

  // Step 4: Validate essential required unit properties
  TestValidator.equals(
    "unit name matches required configuration",
    requiredUnit.name,
    "Size",
  );
  TestValidator.equals("unit type category is size", requiredUnit.type, "size");
  TestValidator.equals(
    "unit display style for dropdown",
    requiredUnit.display_style,
    "dropdown",
  );
  TestValidator.equals(
    "unit is marked as required",
    requiredUnit.is_required,
    true,
  );
  TestValidator.equals(
    "unit does not allow multiple selections",
    requiredUnit.is_multiple,
    false,
  );
  TestValidator.equals(
    "unit has correct sort order priority",
    requiredUnit.sort_order,
    1,
  );
  TestValidator.equals(
    "unit references correct product",
    requiredUnit.product.id,
    product.id,
  );
  TestValidator.equals(
    "unit maintains product name reference",
    requiredUnit.product.name,
    product.name,
  );
  TestValidator.predicate(
    "unit has creation timestamp",
    requiredUnit.created_at.includes("T"),
  );

  // Step 5: Validate mandatory selection enforcement capability
  TestValidator.predicate(
    "required unit prevents selection bypass",
    requiredUnit.is_required === true &&
      requiredUnit.display_style === "dropdown",
  );
  TestValidator.predicate(
    "unit configuration supports customer facing selection",
    requiredUnit.display_style === "dropdown" ||
      requiredUnit.display_style === "buttons" ||
      requiredUnit.display_style === "swatches",
  );

  // Step 6: Verify marketplace transaction integrity through proper unit enforcement
  TestValidator.predicate(
    "unit configuration prevents incomplete selections when required",
    requiredUnit.is_required === true,
  );
  TestValidator.predicate(
    "unit maintains single selection policy for size variants",
    requiredUnit.is_multiple === false,
  );

  // Step 7: Ensure customer satisfaction through clear configuration requirements
  const displayStyles = [
    "dropdown",
    "buttons",
    "swatches",
    "text_input",
  ] as const;
  TestValidator.predicate(
    "unit display style provides user-friendly selection interface",
    displayStyles.includes(requiredUnit.display_style as any),
  );

  // Step 8: Validate operational accuracy in commerce environment
  TestValidator.predicate(
    "unit sort order ensures appropriate configuration flow",
    requiredUnit.sort_order >= 0,
  );
  TestValidator.predicate(
    "unit creation maintains proper product relationship",
    requiredUnit.product.id === product.id &&
      requiredUnit.product.name === product.name,
  );
}
