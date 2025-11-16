import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleVariantAttribute";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the pagination and sorting capabilities of variant attribute retrieval.
 *
 * This scenario validates that variant attributes can be filtered, sorted, and
 * paginated according to query parameters.
 *
 * Workflow steps:
 *
 * 1. Admin authenticates and creates a product category
 * 2. Seller authenticates and creates a product sale
 * 3. Test pagination and sorting on existing variant attributes (if any)
 * 4. Retrieve variant attributes with pagination parameters (page=1, limit=2)
 * 5. Retrieve variant attributes sorted by name in ascending order
 * 6. Retrieve variant attributes sorted by display_order in descending order
 * 7. Retrieve variant attributes sorted by created_at timestamp
 * 8. Use search parameter to filter attributes by name pattern
 *
 * Business logic validations:
 *
 * - Pagination correctly limits results per page
 * - Page navigation returns appropriate subsets of attributes
 * - Sorting by display_order respects seller's intended presentation order
 * - Sorting by name provides alphabetical ordering
 * - Sorting by created_at shows chronological creation sequence
 * - Search filtering finds attributes matching name patterns
 * - Pagination metadata accurately reflects total records and pages
 * - Sort order (asc/desc) is properly applied
 */
export async function test_api_variant_attributes_pagination_sorting(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates and creates a product category
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
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 2: Seller authenticates and creates a product sale
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "sellerpass123",
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(3),
        business_description: RandomGenerator.paragraph(),
        store_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 5 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(sale);

  // Step 3: Retrieve variant attributes with pagination (page=1, limit=2)
  const page1Result: IPageIShoppingMallSaleVariantAttribute.ISummary =
    await api.functional.shoppingMall.sales.variantAttributes.index(
      connection,
      {
        saleCode: sale.code,
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallSaleVariantAttribute.IRequest,
      },
    );
  typia.assert(page1Result);

  TestValidator.predicate(
    "pagination metadata should be present",
    page1Result.pagination !== null && page1Result.pagination !== undefined,
  );
  TestValidator.predicate(
    "page 1 should return at most 2 items",
    page1Result.data.length <= 2,
  );
  TestValidator.equals(
    "current page should be 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "page limit should be 2",
    page1Result.pagination.limit,
    2,
  );

  // Step 4: Retrieve variant attributes sorted by name in ascending order
  const sortedByNameAsc: IPageIShoppingMallSaleVariantAttribute.ISummary =
    await api.functional.shoppingMall.sales.variantAttributes.index(
      connection,
      {
        saleCode: sale.code,
        body: {
          sort_by: "name",
          order: "asc",
        } satisfies IShoppingMallSaleVariantAttribute.IRequest,
      },
    );
  typia.assert(sortedByNameAsc);

  if (sortedByNameAsc.data.length > 1) {
    for (let i = 0; i < sortedByNameAsc.data.length - 1; i++) {
      TestValidator.predicate(
        "attributes should be sorted by name ascending",
        sortedByNameAsc.data[i].name <= sortedByNameAsc.data[i + 1].name,
      );
    }
  }

  // Step 5: Retrieve variant attributes sorted by display_order in descending order
  const sortedByDisplayOrderDesc: IPageIShoppingMallSaleVariantAttribute.ISummary =
    await api.functional.shoppingMall.sales.variantAttributes.index(
      connection,
      {
        saleCode: sale.code,
        body: {
          sort_by: "display_order",
          order: "desc",
        } satisfies IShoppingMallSaleVariantAttribute.IRequest,
      },
    );
  typia.assert(sortedByDisplayOrderDesc);

  if (sortedByDisplayOrderDesc.data.length > 1) {
    for (let i = 0; i < sortedByDisplayOrderDesc.data.length - 1; i++) {
      TestValidator.predicate(
        "attributes should be sorted by display_order descending",
        sortedByDisplayOrderDesc.data[i].display_order >=
          sortedByDisplayOrderDesc.data[i + 1].display_order,
      );
    }
  }

  // Step 6: Retrieve variant attributes sorted by created_at timestamp
  const sortedByCreatedAt: IPageIShoppingMallSaleVariantAttribute.ISummary =
    await api.functional.shoppingMall.sales.variantAttributes.index(
      connection,
      {
        saleCode: sale.code,
        body: {
          sort_by: "created_at",
          order: "asc",
        } satisfies IShoppingMallSaleVariantAttribute.IRequest,
      },
    );
  typia.assert(sortedByCreatedAt);

  if (sortedByCreatedAt.data.length > 1) {
    for (let i = 0; i < sortedByCreatedAt.data.length - 1; i++) {
      const date1 = new Date(sortedByCreatedAt.data[i].created_at);
      const date2 = new Date(sortedByCreatedAt.data[i + 1].created_at);
      TestValidator.predicate(
        "attributes should be sorted by created_at ascending",
        date1.getTime() <= date2.getTime(),
      );
    }
  }

  // Step 7: Use search parameter to filter attributes by name pattern
  if (sortedByNameAsc.data.length > 0) {
    const firstAttribute = sortedByNameAsc.data[0];
    const searchTerm = firstAttribute.name.substring(0, 3);

    const searchResult: IPageIShoppingMallSaleVariantAttribute.ISummary =
      await api.functional.shoppingMall.sales.variantAttributes.index(
        connection,
        {
          saleCode: sale.code,
          body: {
            search: searchTerm,
          } satisfies IShoppingMallSaleVariantAttribute.IRequest,
        },
      );
    typia.assert(searchResult);

    TestValidator.predicate(
      "search should return attributes matching the search term",
      searchResult.data.every((attr) => attr.name.includes(searchTerm)),
    );
  }

  // Verify pagination metadata accuracy
  TestValidator.predicate(
    "total pages should be calculated correctly",
    page1Result.pagination.pages ===
      Math.ceil(page1Result.pagination.records / page1Result.pagination.limit),
  );
}
