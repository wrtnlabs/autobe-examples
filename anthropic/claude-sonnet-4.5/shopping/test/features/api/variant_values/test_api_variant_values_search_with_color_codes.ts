import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleVariantValue";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test retrieval of variant values that include color codes for visual swatch
 * display.
 *
 * This scenario validates that variant values with color_code properties are
 * correctly returned in search results, enabling visual color selection
 * interfaces. Creates a color variant attribute and adds multiple color values
 * with hexadecimal color codes (e.g., 'Red' with '#FF0000', 'Blue' with
 * '#0000FF', 'Green' with '#00FF00'). Retrieves the values and validates that
 * each returned value includes its color_code property correctly formatted.
 * Also tests variant values without color codes (for non-color attributes like
 * Size) to ensure the color_code field is properly null when not applicable.
 */
export async function test_api_variant_values_search_with_color_codes(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create admin account
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create category (as admin)
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch to seller and create product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new" as const,
        return_policy_days: 30 as const,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Create Color variant attribute
  const colorAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: sale.code,
        body: {
          name: "Color",
          display_order: 0,
        } satisfies IShoppingMallSaleVariantAttribute.ICreate,
      },
    );
  typia.assert(colorAttribute);

  // Step 6: Add color values with color codes
  const colorValues = [
    { value: "Red", color_code: "#FF0000", display_order: 0 },
    { value: "Blue", color_code: "#0000FF", display_order: 1 },
    { value: "Green", color_code: "#00FF00", display_order: 2 },
  ];

  const createdColorValues = await ArrayUtil.asyncMap(
    colorValues,
    async (colorData) => {
      const colorValue =
        await api.functional.shoppingMall.seller.sales.variantAttributes.values.create(
          connection,
          {
            saleCode: sale.code,
            variantAttributeId: colorAttribute.id,
            body: {
              value: colorData.value,
              color_code: colorData.color_code,
              display_order: colorData.display_order,
            } satisfies IShoppingMallSaleVariantValue.ICreate,
          },
        );
      typia.assert(colorValue);
      return colorValue;
    },
  );

  // Step 7: Retrieve color variant values
  const colorValuesResponse =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.index(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: colorAttribute.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSaleVariantValue.IRequest,
      },
    );
  typia.assert(colorValuesResponse);

  // Step 8: Validate color values have color_code property
  TestValidator.equals(
    "color values count",
    colorValuesResponse.data.length,
    3,
  );

  for (const retrievedValue of colorValuesResponse.data) {
    const originalValue = colorValues.find(
      (cv) => cv.value === retrievedValue.value,
    );
    if (originalValue) {
      TestValidator.equals(
        `color code for ${retrievedValue.value}`,
        retrievedValue.color_code,
        originalValue.color_code,
      );
    }
  }

  // Step 9: Create Size variant attribute (non-color)
  const sizeAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: sale.code,
        body: {
          name: "Size",
          display_order: 1,
        } satisfies IShoppingMallSaleVariantAttribute.ICreate,
      },
    );
  typia.assert(sizeAttribute);

  // Step 10: Add size values without color codes
  const sizeValues = [
    { value: "S", display_order: 0 },
    { value: "M", display_order: 1 },
    { value: "L", display_order: 2 },
  ];

  await ArrayUtil.asyncMap(sizeValues, async (sizeData) => {
    const sizeValue =
      await api.functional.shoppingMall.seller.sales.variantAttributes.values.create(
        connection,
        {
          saleCode: sale.code,
          variantAttributeId: sizeAttribute.id,
          body: {
            value: sizeData.value,
            display_order: sizeData.display_order,
          } satisfies IShoppingMallSaleVariantValue.ICreate,
        },
      );
    typia.assert(sizeValue);
    return sizeValue;
  });

  // Step 11: Retrieve size variant values
  const sizeValuesResponse =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.index(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: sizeAttribute.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSaleVariantValue.IRequest,
      },
    );
  typia.assert(sizeValuesResponse);

  // Step 12: Validate size values have null color_code
  TestValidator.equals("size values count", sizeValuesResponse.data.length, 3);

  for (const sizeValue of sizeValuesResponse.data) {
    TestValidator.equals(
      `color code for size ${sizeValue.value} should be null`,
      sizeValue.color_code,
      null,
    );
  }
}
