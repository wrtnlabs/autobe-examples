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
 * Test variant attribute value retrieval with different sorting options and
 * sort orders.
 *
 * This scenario validates that variant values can be sorted by display_order,
 * name, and created_at in both ascending and descending order. Creates a
 * variant attribute with multiple values having different display_order values,
 * names, and creation timestamps. Tests sorting by display_order (default) to
 * verify seller-defined presentation order is respected, sorting alphabetically
 * by name for organized browsing, and sorting by created_at to show recently
 * added values first. Validates that ascending and descending order parameters
 * work correctly for each sort field, and that the sort order is consistently
 * applied across paginated results.
 *
 * Test Flow:
 *
 * 1. Create seller account for variant configuration management
 * 2. Create admin account for category management
 * 3. Switch to admin context and create product category
 * 4. Switch to seller context and create product sale
 * 5. Create variant attribute (e.g., "Color")
 * 6. Create multiple variant values with varying display_order and names
 * 7. Test sorting by display_order in ascending order
 * 8. Test sorting by display_order in descending order
 * 9. Test sorting by name in ascending order (alphabetical)
 * 10. Test sorting by name in descending order (reverse alphabetical)
 * 11. Test sorting by created_at in ascending order (oldest first)
 * 12. Test sorting by created_at in descending order (newest first)
 */
export async function test_api_variant_values_search_with_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerData = {
    email: sellerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 2: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 3: Switch to admin and create category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminData.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: RandomGenerator.pick(["active", "inactive"] as const),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 4: Switch to seller and create product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerData.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const saleData = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    condition: RandomGenerator.pick(["new", "refurbished", "used"] as const),
    return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleData,
    },
  );
  typia.assert(sale);

  // Step 5: Create variant attribute
  const variantAttributeData = {
    name: "Color",
    display_order: 0,
  } satisfies IShoppingMallSaleVariantAttribute.ICreate;

  const variantAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: sale.code,
        body: variantAttributeData,
      },
    );
  typia.assert(variantAttribute);

  // Step 6: Create multiple variant values with different properties
  const variantValuesData = [
    { value: "Red", display_order: 3 },
    { value: "Blue", display_order: 1 },
    { value: "Green", display_order: 5 },
    { value: "Yellow", display_order: 2 },
    { value: "Purple", display_order: 4 },
  ];

  const createdValues: IShoppingMallSaleVariantValue[] = [];
  for (const valueData of variantValuesData) {
    const variantValue =
      await api.functional.shoppingMall.seller.sales.variantAttributes.values.create(
        connection,
        {
          saleCode: sale.code,
          variantAttributeId: variantAttribute.id,
          body: valueData satisfies IShoppingMallSaleVariantValue.ICreate,
        },
      );
    typia.assert(variantValue);
    createdValues.push(variantValue);
  }

  // Step 7: Test sorting by display_order in ascending order
  const sortByDisplayOrderAsc =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.index(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: variantAttribute.id,
        body: {
          sort: "display_order",
          order: "asc",
        } satisfies IShoppingMallSaleVariantValue.IRequest,
      },
    );
  typia.assert(sortByDisplayOrderAsc);

  const expectedDisplayOrderAsc = [...createdValues].sort(
    (a, b) => a.display_order - b.display_order,
  );
  TestValidator.equals(
    "variant values sorted by display_order ascending",
    sortByDisplayOrderAsc.data.map((v) => v.id),
    expectedDisplayOrderAsc.map((v) => v.id),
  );

  // Step 8: Test sorting by display_order in descending order
  const sortByDisplayOrderDesc =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.index(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: variantAttribute.id,
        body: {
          sort: "display_order",
          order: "desc",
        } satisfies IShoppingMallSaleVariantValue.IRequest,
      },
    );
  typia.assert(sortByDisplayOrderDesc);

  const expectedDisplayOrderDesc = [...createdValues].sort(
    (a, b) => b.display_order - a.display_order,
  );
  TestValidator.equals(
    "variant values sorted by display_order descending",
    sortByDisplayOrderDesc.data.map((v) => v.id),
    expectedDisplayOrderDesc.map((v) => v.id),
  );

  // Step 9: Test sorting by name in ascending order (alphabetical)
  const sortByNameAsc =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.index(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: variantAttribute.id,
        body: {
          sort: "name",
          order: "asc",
        } satisfies IShoppingMallSaleVariantValue.IRequest,
      },
    );
  typia.assert(sortByNameAsc);

  const expectedNameAsc = [...createdValues].sort((a, b) =>
    a.value.localeCompare(b.value),
  );
  TestValidator.equals(
    "variant values sorted by name ascending (alphabetical)",
    sortByNameAsc.data.map((v) => v.id),
    expectedNameAsc.map((v) => v.id),
  );

  // Step 10: Test sorting by name in descending order (reverse alphabetical)
  const sortByNameDesc =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.index(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: variantAttribute.id,
        body: {
          sort: "name",
          order: "desc",
        } satisfies IShoppingMallSaleVariantValue.IRequest,
      },
    );
  typia.assert(sortByNameDesc);

  const expectedNameDesc = [...createdValues].sort((a, b) =>
    b.value.localeCompare(a.value),
  );
  TestValidator.equals(
    "variant values sorted by name descending (reverse alphabetical)",
    sortByNameDesc.data.map((v) => v.id),
    expectedNameDesc.map((v) => v.id),
  );

  // Step 11: Test sorting by created_at in ascending order (oldest first)
  const sortByCreatedAtAsc =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.index(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: variantAttribute.id,
        body: {
          sort: "created_at",
          order: "asc",
        } satisfies IShoppingMallSaleVariantValue.IRequest,
      },
    );
  typia.assert(sortByCreatedAtAsc);

  const expectedCreatedAtAsc = [...createdValues].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  TestValidator.equals(
    "variant values sorted by created_at ascending (oldest first)",
    sortByCreatedAtAsc.data.map((v) => v.id),
    expectedCreatedAtAsc.map((v) => v.id),
  );

  // Step 12: Test sorting by created_at in descending order (newest first)
  const sortByCreatedAtDesc =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.index(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: variantAttribute.id,
        body: {
          sort: "created_at",
          order: "desc",
        } satisfies IShoppingMallSaleVariantValue.IRequest,
      },
    );
  typia.assert(sortByCreatedAtDesc);

  const expectedCreatedAtDesc = [...createdValues].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  TestValidator.equals(
    "variant values sorted by created_at descending (newest first)",
    sortByCreatedAtDesc.data.map((v) => v.id),
    expectedCreatedAtDesc.map((v) => v.id),
  );
}
