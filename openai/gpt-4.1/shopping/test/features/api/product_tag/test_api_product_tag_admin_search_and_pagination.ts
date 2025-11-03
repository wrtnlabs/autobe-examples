import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingProductTag";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductTag";

/**
 * E2E test for admin search and pagination of product tags.
 *
 * This test verifies that an authenticated admin can retrieve and filter
 * product tags using the advanced search capabilities in the
 * /shopping/admin/productTags endpoint.
 *
 * Steps:
 *
 * 1. Register a new admin user.
 * 2. Perform an advanced tag listing (search/query) as the admin.
 * 3. Validate response structure and pagination correctness.
 * 4. Exercise filtering (tag_code, display_value, description), search, pagination
 *    and sorting logic.
 * 5. Attempt access with an unauthorized/unauthenticated connection, expecting
 *    error.
 */
export async function test_api_product_tag_admin_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        name: RandomGenerator.name(),
        role: "super", // fixed for test, must match RBAC constraint
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create product tags (simulate indirect creation by search, since no create API is available)
  //    We do not have a direct API to add tags, so assume that tags already exist in the database.
  //    We'll fetch a list and use one as a reference for filtering.

  // 3. Search with no filters/pagination (default all)
  const listAll: IPageIShoppingProductTag.ISummary =
    await api.functional.shopping.admin.productTags.index(connection, {
      body: {} satisfies IShoppingProductTag.IRequest,
    });
  typia.assert(listAll);
  TestValidator.predicate(
    "admin can get at least one tag",
    listAll.data.length > 0,
  );
  const refTag = listAll.data[0];

  // 4. Test tag_code filter
  const filterByCode = await api.functional.shopping.admin.productTags.index(
    connection,
    {
      body: {
        tag_code: refTag.tag_code,
      } satisfies IShoppingProductTag.IRequest,
    },
  );
  typia.assert(filterByCode);
  TestValidator.predicate(
    "tag_code filter returns only expected tag(s)",
    filterByCode.data.every((t) => t.tag_code === refTag.tag_code),
  );

  // 5. Test display_value filter
  const filterByDisplayValue =
    await api.functional.shopping.admin.productTags.index(connection, {
      body: {
        display_value: refTag.display_value,
      } satisfies IShoppingProductTag.IRequest,
    });
  typia.assert(filterByDisplayValue);
  TestValidator.predicate(
    "display_value filter returns only expected tags",
    filterByDisplayValue.data.every(
      (t) => t.display_value === refTag.display_value,
    ),
  );

  // 6. Test description (if any description exists; else skip)
  if (
    refTag.description !== null &&
    refTag.description !== undefined &&
    refTag.description.length > 0
  ) {
    const filterByDesc = await api.functional.shopping.admin.productTags.index(
      connection,
      {
        body: {
          description: refTag.description,
        } satisfies IShoppingProductTag.IRequest,
      },
    );
    typia.assert(filterByDesc);
    TestValidator.predicate(
      "description filter returns only tags with matching description",
      filterByDesc.data.every((t) => t.description === refTag.description),
    );
  }

  // 7. Test basic search (partial string from display_value)
  const partial = refTag.display_value.slice(
    0,
    Math.max(1, Math.floor(refTag.display_value.length / 2)),
  );
  const searchResult = await api.functional.shopping.admin.productTags.index(
    connection,
    {
      body: { search: partial } satisfies IShoppingProductTag.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns tags with display_value containing partial",
    searchResult.data.some((t) => t.display_value.includes(partial)),
  );

  // 8. Test pagination: get first page with limit 2, then page 2 with same limit
  const firstPage = await api.functional.shopping.admin.productTags.index(
    connection,
    {
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: 2 as number & tags.Type<"int32">,
      } satisfies IShoppingProductTag.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination: limit 2",
    firstPage.data.length,
    Math.min(2, listAll.pagination.records),
  );
  const secondPage = await api.functional.shopping.admin.productTags.index(
    connection,
    {
      body: {
        page: 2 as number & tags.Type<"int32">,
        limit: 2 as number & tags.Type<"int32">,
      } satisfies IShoppingProductTag.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals(
    "pagination: second page returns valid data array",
    Array.isArray(secondPage.data),
    true,
  );

  // 9. Sorting: sort_by display_value ascending
  const sortedAsc = await api.functional.shopping.admin.productTags.index(
    connection,
    {
      body: {
        sort_by: "display_value",
        order: "asc",
      } satisfies IShoppingProductTag.IRequest,
    },
  );
  typia.assert(sortedAsc);
  for (let i = 1; i < sortedAsc.data.length; ++i) {
    TestValidator.predicate(
      `sorting ascending: ${sortedAsc.data[i - 1].display_value} <= ${sortedAsc.data[i].display_value}`,
      sortedAsc.data[i - 1].display_value <= sortedAsc.data[i].display_value,
    );
  }
  // sort_by display_value descending
  const sortedDesc = await api.functional.shopping.admin.productTags.index(
    connection,
    {
      body: {
        sort_by: "display_value",
        order: "desc",
      } satisfies IShoppingProductTag.IRequest,
    },
  );
  typia.assert(sortedDesc);
  for (let i = 1; i < sortedDesc.data.length; ++i) {
    TestValidator.predicate(
      `sorting descending: ${sortedDesc.data[i - 1].display_value} >= ${sortedDesc.data[i].display_value}`,
      sortedDesc.data[i - 1].display_value >= sortedDesc.data[i].display_value,
    );
  }
  // 10. Unauthorized call: clear headers, call as unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access is blocked", async () => {
    await api.functional.shopping.admin.productTags.index(unauthConn, {
      body: {} satisfies IShoppingProductTag.IRequest,
    });
  });
}
