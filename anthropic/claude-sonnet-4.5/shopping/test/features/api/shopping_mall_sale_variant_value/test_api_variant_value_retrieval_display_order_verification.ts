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
 * Test variant attribute value retrieval with display_order verification.
 *
 * This test validates that sellers can define specific ordering of variant
 * options (e.g., Small, Medium, Large for sizes) and that this ordering
 * information is accurately returned when retrieving individual variant
 * values.
 *
 * Test Flow:
 *
 * 1. Create admin account and product category
 * 2. Create seller account and authenticate
 * 3. Create a product sale
 * 4. Create a 'Size' variant attribute
 * 5. Add variant values with specific display_order (Small=0, Medium=1, Large=2)
 * 6. Retrieve each value individually and verify display_order is correct
 */
export async function test_api_variant_value_retrieval_display_order_verification(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category setup
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // Step 2: Create product category
  const categoryBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // Step 3: Create seller account
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(3),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // Step 4: Create product sale
  const saleBody = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    condition: "new" as const,
    return_policy_days: 30 as const,
  } satisfies IShoppingMallSale.ICreate;

  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: saleBody,
    });
  typia.assert(sale);

  // Step 5: Create Size variant attribute
  const variantAttributeBody = {
    name: "Size",
    display_order: 0,
  } satisfies IShoppingMallSaleVariantAttribute.ICreate;

  const variantAttribute: IShoppingMallSaleVariantAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: sale.code,
        body: variantAttributeBody,
      },
    );
  typia.assert(variantAttribute);

  // Step 6: Create variant values with specific display_order
  const smallValueBody = {
    value: "Small",
    display_order: 0,
  } satisfies IShoppingMallSaleVariantValue.ICreate;

  const smallValue: IShoppingMallSaleVariantValue =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.create(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: variantAttribute.id,
        body: smallValueBody,
      },
    );
  typia.assert(smallValue);

  const mediumValueBody = {
    value: "Medium",
    display_order: 1,
  } satisfies IShoppingMallSaleVariantValue.ICreate;

  const mediumValue: IShoppingMallSaleVariantValue =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.create(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: variantAttribute.id,
        body: mediumValueBody,
      },
    );
  typia.assert(mediumValue);

  const largeValueBody = {
    value: "Large",
    display_order: 2,
  } satisfies IShoppingMallSaleVariantValue.ICreate;

  const largeValue: IShoppingMallSaleVariantValue =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.create(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: variantAttribute.id,
        body: largeValueBody,
      },
    );
  typia.assert(largeValue);

  // Step 7: Retrieve each variant value and verify display_order
  const retrievedSmall: IShoppingMallSaleVariantValue =
    await api.functional.shoppingMall.sales.variantAttributes.values.at(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: variantAttribute.id,
        valueId: smallValue.id,
      },
    );
  typia.assert(retrievedSmall);
  TestValidator.equals(
    "Small value display_order",
    retrievedSmall.display_order,
    0,
  );

  const retrievedMedium: IShoppingMallSaleVariantValue =
    await api.functional.shoppingMall.sales.variantAttributes.values.at(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: variantAttribute.id,
        valueId: mediumValue.id,
      },
    );
  typia.assert(retrievedMedium);
  TestValidator.equals(
    "Medium value display_order",
    retrievedMedium.display_order,
    1,
  );

  const retrievedLarge: IShoppingMallSaleVariantValue =
    await api.functional.shoppingMall.sales.variantAttributes.values.at(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: variantAttribute.id,
        valueId: largeValue.id,
      },
    );
  typia.assert(retrievedLarge);
  TestValidator.equals(
    "Large value display_order",
    retrievedLarge.display_order,
    2,
  );
}
