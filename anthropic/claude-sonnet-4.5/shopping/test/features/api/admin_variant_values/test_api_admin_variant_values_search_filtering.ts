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
 * Test administrator's ability to search and filter variant values by name for
 * marketplace quality monitoring.
 *
 * This scenario validates that admins can use search capabilities to find
 * specific variant values across products, enabling detection of inappropriate
 * content, trademark violations, or misleading variant names. Creates a seller
 * account with a product containing variant values with various names,
 * including some that might require moderation review. The admin searches using
 * partial text matching to find specific values (e.g., searching for brand
 * names that shouldn't be used, or inappropriate terms). Validates that search
 * filtering works correctly for admins and returns accurate results for content
 * moderation workflows.
 *
 * Steps:
 *
 * 1. Create admin account for content moderation capabilities
 * 2. Create seller account for product listing
 * 3. Switch to admin context and create category for product organization
 * 4. Switch to seller context and create product sale
 * 5. Create variant attribute (e.g., "Brand" or "Color") for value organization
 * 6. Create multiple variant values with various names for search testing
 * 7. Switch to admin context for content moderation search
 * 8. Perform search operation with specific search term
 * 9. Validate search results contain only matching values
 * 10. Verify pagination metadata is accurate
 */
export async function test_api_admin_variant_values_search_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for content moderation capabilities
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "moderator",
      email_verified: true,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create seller account for product listing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123";
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph(),
      store_name: RandomGenerator.name(2),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 3: Switch to admin context and create category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph(),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        status: "active",
        parent_id: null,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch to seller context and create product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: typia.random<string & tags.Format<"ipv4">>(),
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
        title: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.name(1),
        condition: "new",
        short_description: RandomGenerator.paragraph({ sentences: 5 }),
        return_policy_days: 14,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Create variant attribute for value organization
  const variantAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: sale.code,
        body: {
          name: "Brand",
          display_order: 0,
        } satisfies IShoppingMallSaleVariantAttribute.ICreate,
      },
    );
  typia.assert(variantAttribute);

  // Step 6: Create multiple variant values with various names for search testing
  const searchTerm = "Nike";
  const variantValueNames = [
    "Nike Air",
    "Nike Pro",
    "Adidas",
    "Puma",
    "Nike Max",
    "Reebok",
    "Nike Jordan",
  ];

  const createdValues = await ArrayUtil.asyncMap(
    variantValueNames,
    async (valueName, index) => {
      const value =
        await api.functional.shoppingMall.seller.sales.variantAttributes.values.create(
          connection,
          {
            saleCode: sale.code,
            variantAttributeId: variantAttribute.id,
            body: {
              value: valueName,
              display_order: index,
              color_code: null,
            } satisfies IShoppingMallSaleVariantValue.ICreate,
          },
        );
      typia.assert(value);
      return value;
    },
  );

  // Step 7: Switch to admin context for content moderation search
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 8: Perform search operation with specific search term
  const searchResult =
    await api.functional.shoppingMall.admin.sales.variantAttributes.values.index(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: variantAttribute.id,
        body: {
          page: 1,
          limit: 10,
          search: searchTerm,
          sort: "display_order",
          order: "asc",
        } satisfies IShoppingMallSaleVariantValue.IRequest,
      },
    );
  typia.assert(searchResult);

  // Step 9: Validate search results contain only matching values
  const expectedMatches = createdValues.filter((v) =>
    v.value.includes(searchTerm),
  );

  TestValidator.equals(
    "search result count matches expected",
    searchResult.data.length,
    expectedMatches.length,
  );

  TestValidator.predicate(
    "all returned values contain search term",
    searchResult.data.every((v) => v.value.includes(searchTerm)),
  );

  // Step 10: Verify pagination metadata is accurate
  TestValidator.equals(
    "pagination records match result count",
    searchResult.pagination.records,
    expectedMatches.length,
  );

  TestValidator.equals(
    "pagination current page is 1",
    searchResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit is 10",
    searchResult.pagination.limit,
    10,
  );
}
