import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test retrieving a variant attribute value that includes color code
 * information for visual swatch display.
 *
 * This scenario validates that color variant values properly return hexadecimal
 * color codes that can be used to render color swatches in product
 * configuration interfaces. Create a category, product sale, variant attribute
 * for 'Color', and add a variant value with both value text ('Crimson Red') and
 * a color_code ('#DC143C'). Retrieve the variant value and verify that both the
 * text value and color_code are returned correctly. Validate that the
 * color_code follows the hexadecimal format and can be used for visual
 * rendering. This ensures buyers can see both text labels and visual color
 * representations when selecting product variants.
 *
 * Test Steps:
 *
 * 1. Create admin account for category management
 * 2. Create product category
 * 3. Create seller account for product and variant management
 * 4. Create product sale
 * 5. Create Color variant attribute
 * 6. Create variant value with color_code for swatch display
 * 7. Retrieve variant value and validate color_code
 */
export async function test_api_variant_value_retrieval_with_color_swatch(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Electronics",
        slug: "electronics",
        description: "Electronic products category",
        parent_id: null,
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.paragraph({ sentences: 5 }),
        store_name: RandomGenerator.name(2),
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Create product sale
  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        shopping_mall_category_id: category.id,
        title: "T-Shirt Product",
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: "BrandName",
        condition: "new",
        short_description: RandomGenerator.paragraph({ sentences: 3 }),
        meta_keywords: "shirt, clothing, fashion",
        weight: 0.5,
        dimension_length: 30,
        dimension_width: 25,
        dimension_height: 2,
        manufacturer: "ManufacturerName",
        return_policy_days: 30,
        warranty_info: "1 year warranty",
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(sale);

  // Step 5: Create Color variant attribute
  const colorAttribute: IShoppingMallSaleVariantAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: sale.code,
        body: {
          name: "Color",
          display_order: 1,
        } satisfies IShoppingMallSaleVariantAttribute.ICreate,
      },
    );
  typia.assert(colorAttribute);

  // Step 6: Create variant value with color_code
  const colorValue: IShoppingMallSaleVariantValue =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.create(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: colorAttribute.id,
        body: {
          value: "Crimson Red",
          display_order: 1,
          color_code: "#DC143C",
        } satisfies IShoppingMallSaleVariantValue.ICreate,
      },
    );
  typia.assert(colorValue);

  // Step 7: Retrieve variant value and validate
  const retrievedValue: IShoppingMallSaleVariantValue =
    await api.functional.shoppingMall.sales.variantAttributes.values.at(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: colorAttribute.id,
        valueId: colorValue.id,
      },
    );
  typia.assert(retrievedValue);

  // Validate the retrieved value matches created value
  TestValidator.equals(
    "variant value text matches",
    retrievedValue.value,
    "Crimson Red",
  );
  TestValidator.equals(
    "variant value color_code matches",
    retrievedValue.color_code,
    "#DC143C",
  );
  TestValidator.equals(
    "variant value ID matches",
    retrievedValue.id,
    colorValue.id,
  );

  // Validate color_code format is valid hexadecimal
  const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;
  TestValidator.predicate(
    "color_code follows hexadecimal format",
    hexColorPattern.test(retrievedValue.color_code!),
  );
}
