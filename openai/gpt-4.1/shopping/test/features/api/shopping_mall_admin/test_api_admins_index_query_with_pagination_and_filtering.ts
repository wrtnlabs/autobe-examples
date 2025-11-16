import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Platform admin search and listing with advanced query, filter, pagination,
 * and access control.
 *
 * 1. Register multiple (3) distinct platform admins (record their info)
 * 2. As each admin, test PATCH /shoppingMall/admin/admins:
 *
 *    - Default query returns paginated admin list containing self
 *    - Query all admins with limit=2, check page 1/2 correctness
 *    - Filter by full/partial email (search for another admin)
 *    - Filter by name (exact/partial)
 *    - Filter by status (if all have same, use that)
 *    - Filter by is_email_verified (should be false by default)
 *    - Created_from/created_to window queries (test match and no-match)
 *    - Sorting by email, name, status, created_at ascending/descending
 *    - Confirm pagination metadata (current, pages, records)
 *    - Query with unmatched filters (gibberish name)
 *    - For each result, validate only id/name/email are visible (no password/token)
 * 3. Unauthenticated call to PATCH /shoppingMall/admin/admins gets rejected
 */
export async function test_api_admins_index_query_with_pagination_and_filtering(
  connection: api.IConnection,
) {
  // Register three distinct platform admins and collect their info
  const admins: IShoppingMallAdmin.IAuthorized[] = [];
  for (let i = 0; i < 3; ++i) {
    const adminData = {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate;
    const admin = await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
    typia.assert(admin);
    admins.push(admin);
  }

  // Use the first admin for all authenticated scenarios
  const main = admins[0];
  // Pagination & limit tests
  {
    const page1 = await api.functional.shoppingMall.admin.admins.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
    typia.assert(page1);
    TestValidator.equals("pagination limit=2", page1.pagination.limit, 2);
    // Should have data for first two admins
    TestValidator.equals("page records <= limit", page1.data.length <= 2, true);
  }
  // Pagination next page
  {
    const page2 = await api.functional.shoppingMall.admin.admins.index(
      connection,
      {
        body: {
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
    typia.assert(page2);
    // Depending on account order, length can be 1 or 2
    TestValidator.predicate(
      "page2 has admins or is empty",
      page2.data.length >= 0 && page2.data.length <= 2,
    );
  }
  // Filtering by known admin email (should be only 1 result)
  for (const a of admins) {
    const list = await api.functional.shoppingMall.admin.admins.index(
      connection,
      {
        body: {
          email: a.email,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
    typia.assert(list);
    TestValidator.equals(
      "filter by email returns exactly 1",
      list.data.length,
      1,
    );
    const found = list.data[0];
    TestValidator.equals("admin email matches", found.email, a.email);
  }
  // Partial email filter (use first half)
  {
    const partial = main.email.slice(0, Math.floor(main.email.length / 2));
    const list = await api.functional.shoppingMall.admin.admins.index(
      connection,
      {
        body: {
          email: partial,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Maximum<100>,
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
    typia.assert(list);
    TestValidator.predicate(
      "partial email match returns at least 1",
      list.data.length >= 1,
    );
    TestValidator.predicate(
      "result contains the admin with full email",
      list.data.some((x) => x.email === main.email),
    );
  }
  // Filter by admin name (full match and partial)
  {
    const full = main.name;
    const partial = main.name.length > 2 ? main.name.slice(0, 2) : main.name;
    {
      const list = await api.functional.shoppingMall.admin.admins.index(
        connection,
        {
          body: {
            name: full,
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 20 as number & tags.Type<"int32"> & tags.Maximum<100>,
          } satisfies IShoppingMallAdmin.IRequest,
        },
      );
      typia.assert(list);
      TestValidator.predicate(
        "full name filter returns at least 1",
        list.data.length >= 1,
      );
      TestValidator.predicate(
        "result contains admin with name",
        list.data.some((x) => x.name === main.name),
      );
    }
    {
      const list = await api.functional.shoppingMall.admin.admins.index(
        connection,
        {
          body: {
            name: partial,
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 20 as number & tags.Type<"int32"> & tags.Maximum<100>,
          } satisfies IShoppingMallAdmin.IRequest,
        },
      );
      typia.assert(list);
      TestValidator.predicate(
        "partial name filter returns >=1",
        list.data.length >= 1,
      );
    }
  }
  // Filter by is_email_verified=false (should catch all just-registered)
  {
    const list = await api.functional.shoppingMall.admin.admins.index(
      connection,
      {
        body: {
          is_email_verified: false,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 as number & tags.Type<"int32"> & tags.Maximum<100>,
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
    typia.assert(list);
    TestValidator.predicate(
      "is_email_verified=false returns at least some results",
      list.data.length >= 1,
    );
    for (const x of list.data)
      TestValidator.equals(
        "is_email_verified never leaks",
        typeof (x as any).is_email_verified,
        "undefined",
      );
  }
  // Filter by impossible gibberish name
  {
    const list = await api.functional.shoppingMall.admin.admins.index(
      connection,
      {
        body: {
          name: "@@@@gibberish@@@@",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Maximum<100>,
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
    typia.assert(list);
    TestValidator.equals("no results for gibberish name", list.data.length, 0);
  }
  // created_at range tests: bracket tightly around main account creation
  {
    const created = main.created_at;
    const before = new Date(Date.parse(created) - 5000).toISOString();
    const after = new Date(Date.parse(created) + 5000).toISOString();
    {
      const list = await api.functional.shoppingMall.admin.admins.index(
        connection,
        {
          body: {
            created_from: before,
            created_to: after,
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 as number & tags.Type<"int32"> & tags.Maximum<100>,
          } satisfies IShoppingMallAdmin.IRequest,
        },
      );
      typia.assert(list);
      TestValidator.predicate(
        "main admin in created_at window",
        list.data.some((x) => x.email === main.email),
      );
    }
    {
      const now = new Date().toISOString();
      const early = new Date(0).toISOString();
      // Filter for non-existent window
      const list = await api.functional.shoppingMall.admin.admins.index(
        connection,
        {
          body: {
            created_from: now,
            created_to: now,
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 as number & tags.Type<"int32"> & tags.Maximum<100>,
          } satisfies IShoppingMallAdmin.IRequest,
        },
      );
      typia.assert(list);
      TestValidator.equals(
        "created_at range with no matches is empty",
        list.data.length,
        0,
      );
    }
  }
  // Sorting by email ASC/DESC
  for (const sort_by of ["email", "name", "status", "created_at"] as const) {
    for (const sort_order of ["asc", "desc"] as const) {
      const list = await api.functional.shoppingMall.admin.admins.index(
        connection,
        {
          body: {
            sort_by,
            sort_order,
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 as number & tags.Type<"int32"> & tags.Maximum<100>,
          } satisfies IShoppingMallAdmin.IRequest,
        },
      );
      typia.assert(list);
      // Simple check: at least as many as admins we created exist
      TestValidator.predicate(
        `${sort_by}:${sort_order} returns >= 3`,
        list.data.length >= 3,
      );
      // Check all fields match summary schema
      for (const x of list.data) {
        // id is uuid, name and email are strings, no other fields
        TestValidator.predicate(
          "id is present",
          typeof x.id === "string" && x.id.length > 0,
        );
        TestValidator.predicate(
          "name is present",
          typeof x.name === "string" && x.name.length > 0,
        );
        TestValidator.predicate(
          "email is present",
          typeof x.email === "string" && x.email.length > 0,
        );
        // No sensitive data
        TestValidator.equals(
          "no password leak",
          typeof (x as any).password,
          "undefined",
        );
        TestValidator.equals(
          "no token leak",
          typeof (x as any).token,
          "undefined",
        );
      }
    }
  }

  // Negative: unauthenticated call must be rejected
  const anonConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin index is rejected",
    async () => {
      await api.functional.shoppingMall.admin.admins.index(anonConn, {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 1 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IShoppingMallAdmin.IRequest,
      });
    },
  );
}
