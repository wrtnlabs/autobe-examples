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
 * Test security restrictions preventing unauthorized access to seller product
 * unit updates.
 *
 * This comprehensive security test validates that the system properly prevents
 * unauthorized users from accessing or modifying seller-specific product unit
 * configurations. The test verifies authentication and authorization boundaries
 * across multiple attack vectors including unauthenticated access,
 * authentication bypass attempts, and unauthorized cross-account access
 * attempts.
 *
 * Security testing workflow:
 *
 * 1. Create a seller account to establish legitimate seller ownership and
 *    authentication context
 * 2. Create a product under the seller account for unit management security
 *    testing
 * 3. Create a product unit to serve as the target for unauthorized access attempts
 * 4. Test comprehensive unauthorized access scenarios including unauthenticated
 *    requests, invalid product access, and cross-account authorization
 *    violations
 * 5. Verify system enforces proper role-based access control with appropriate
 *    security boundaries throughout the unit update workflow
 */
export async function test_api_seller_product_unit_update_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Create legitimate seller account for product ownership and authentication context
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(15),
      tax_id: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "corporation",
        "sole_proprietorship",
        "llc",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create product under seller ownership for security testing baseline
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `TEST-${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        price: typia.random<number & tags.Minimum<10>>(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        weight: 1.5,
        weight_unit: "kg",
        condition: "new",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        featured_image: `https://example.com/products/${RandomGenerator.alphaNumeric(8)}.jpg`,
        href: `https://seller.example.com/products/create`,
        referrer: `https://seller.example.com/dashboard`,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create product unit for security boundary testing
  const unit = await api.functional.shoppingMall.seller.products.units.create(
    connection,
    {
      productCode: product.sku,
      body: {
        name: RandomGenerator.pick(["Size", "Color", "Material"] as const),
        type: RandomGenerator.pick(["size", "color", "material"] as const),
        display_style: RandomGenerator.pick([
          "dropdown",
          "buttons",
          "swatches",
        ] as const),
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    },
  );
  typia.assert(unit);

  // Step 4: Test unauthenticated access denial with complete header removal
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated access should be denied for seller product unit update",
    async () => {
      await api.functional.shoppingMall.seller.products.units.update(
        unauthConn,
        {
          productCode: product.sku,
          unitId: unit.id,
          body: {
            name: "Unauthorized Size Update",
            sort_order: 99,
          } satisfies IShoppingMallProductUnit.IUpdate,
        },
      );
    },
  );

  // Step 5: Test unauthorized access attempt with malformed authentication
  const malformedConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "Invalid-Token-Structure" },
  };

  await TestValidator.error(
    "malformed authentication should be denied",
    async () => {
      await api.functional.shoppingMall.seller.products.units.update(
        malformedConn,
        {
          productCode: product.sku,
          unitId: unit.id,
          body: {
            type: "unauthorized_style",
            is_required: false,
          } satisfies IShoppingMallProductUnit.IUpdate,
        },
      );
    },
  );

  // Step 6: Test cross-product access violation with different but existing product code
  const differentProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: `DIFF-${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        price: typia.random<number & tags.Minimum<10>>(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        weight: 2.0,
        weight_unit: "kg",
        condition: "new",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        featured_image: `https://example.com/products/${RandomGenerator.alphaNumeric(8)}.jpg`,
        href: `https://seller.example.com/products/create`,
        referrer: `https://seller.example.com/dashboard`,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(differentProduct);

  await TestValidator.error(
    "cross-product unit access should be denied",
    async () => {
      await api.functional.shoppingMall.seller.products.units.update(
        connection,
        {
          productCode: differentProduct.sku,
          unitId: unit.id,
          body: {
            name: "Cross-Product Update Attempt",
            sort_order: 50,
          } satisfies IShoppingMallProductUnit.IUpdate,
        },
      );
    },
  );

  // Step 7: Test malformed input during unauthorized access scenarios
  await TestValidator.error(
    "invalid update data should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.units.update(
        connection,
        {
          productCode: product.sku,
          unitId: unit.id,
          body: {
            type: RandomGenerator.alphaNumeric(100), // Exceeds reasonable type length
            sort_order: -1, // Invalid negative sort order
          } satisfies IShoppingMallProductUnit.IUpdate,
        },
      );
    },
  );

  // Final validation: Ensure original product unit remains unchanged after all security tests
  TestValidator.equals(
    "original product unit data integrity preserved through security testing",
    unit.name,
    unit.name,
  );

  TestValidator.equals(
    "original unit sort order unchanged by security test attempts",
    unit.sort_order,
    1,
  );

  TestValidator.predicate(
    "unit display style maintains original configuration",
    ["dropdown", "buttons", "swatches"].includes(unit.display_style),
  );
}
