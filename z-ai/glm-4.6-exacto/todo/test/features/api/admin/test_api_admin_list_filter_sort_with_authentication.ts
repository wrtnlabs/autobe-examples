import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdmin";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Validate admin list retrieval, filtering, pagination, and sorting with proper
 * authentication.
 *
 * 1. Two distinct admin accounts are created (with unique email and registration
 *    context).
 * 2. Authenticate as the first admin (token applied automatically by SDK).
 * 3. Perform default listing and validate both admins appear.
 * 4. Test filtering by partial email of each admin and validate correct record.
 * 5. Test created_at filter for exact date match and future/past boundaries.
 * 6. Test pagination using limit=1 and verify correct page navigation.
 * 7. Test sort by email and by created_at, both ascending/descending.
 * 8. Attempt admin listing with unauthenticated connection and expect error.
 */
export async function test_api_admin_list_filter_sort_with_authentication(
  connection: api.IConnection,
) {
  // 1. Create two distinct admin accounts
  const email1 = typia.random<string & tags.Format<"email">>();
  const email2 = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);
  const commonHref = "https://admin.todoapp.com/registration";
  const commonReferrer = "https://admin.todoapp.com/landing";

  // Register admin1 and authenticate (so main connection is now admin1)
  const admin1 = await api.functional.auth.admin.join(connection, {
    body: {
      email: email1,
      password: password,
      href: commonHref,
      referrer: commonReferrer,
      ip: undefined,
    } satisfies ITodoAppAdmin.IJoin,
  });
  typia.assert(admin1);

  // Register admin2 -- do this with a fresh unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const admin2 = await api.functional.auth.admin.join(unauthConn, {
    body: {
      email: email2,
      password: password,
      href: commonHref,
      referrer: commonReferrer,
      ip: undefined,
    } satisfies ITodoAppAdmin.IJoin,
  });
  typia.assert(admin2);

  // 2. Authenticate as admin1 (SDK token set already)
  // (no-op: connection is already admin1)

  // 3. Default listing, no filters
  let listing = await api.functional.todoApp.admin.admins.index(connection, {
    body: {} satisfies ITodoAppAdmin.IRequest,
  });
  typia.assert(listing);
  // Both admins should appear
  const emails = listing.data.map((a) => a.email);
  TestValidator.predicate(
    "admin1 and admin2 in default listing",
    emails.includes(email1) && emails.includes(email2),
  );

  // 4. Filter by partial email (admin1)
  const partial1 = email1.substring(0, 5);
  let filtered = await api.functional.todoApp.admin.admins.index(connection, {
    body: { email: partial1 } satisfies ITodoAppAdmin.IRequest,
  });
  typia.assert(filtered);
  TestValidator.predicate(
    "filtered email contains admin1",
    filtered.data.some((a) => a.email === email1),
  );
  TestValidator.predicate(
    "filtered excludes admin2",
    filtered.data.every((a) => a.email.includes(partial1)),
  );

  // 4b. Filter by partial email (admin2)
  const partial2 = email2.substring(0, 6);
  filtered = await api.functional.todoApp.admin.admins.index(connection, {
    body: { email: partial2 } satisfies ITodoAppAdmin.IRequest,
  });
  typia.assert(filtered);
  TestValidator.predicate(
    "filtered email contains admin2",
    filtered.data.some((a) => a.email === email2),
  );
  TestValidator.predicate(
    "filtered excludes admin1",
    filtered.data.every((a) => a.email.includes(partial2)),
  );

  // 5. Filter by created_at (exact match and out-of-range test)
  filtered = await api.functional.todoApp.admin.admins.index(connection, {
    body: { created_at: admin1.created_at } satisfies ITodoAppAdmin.IRequest,
  });
  typia.assert(filtered);
  TestValidator.predicate(
    "created_at exact match returns admin1",
    filtered.data.some((a) => a.email === email1),
  );
  // Out-of-range: far future
  filtered = await api.functional.todoApp.admin.admins.index(connection, {
    body: {
      created_at: new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 365,
      ).toISOString(),
    } satisfies ITodoAppAdmin.IRequest,
  });
  typia.assert(filtered);
  TestValidator.equals(
    "future created_at yields empty result",
    filtered.data.length,
    0,
  );

  // 6. Pagination test (limit 1)
  listing = await api.functional.todoApp.admin.admins.index(connection, {
    body: { limit: 1 } satisfies ITodoAppAdmin.IRequest,
  });
  typia.assert(listing);
  TestValidator.equals("pagination limit 1", listing.data.length, 1);
  TestValidator.predicate(
    "pagination metadata check",
    listing.pagination.limit === 1 && listing.pagination.pages >= 2,
  );

  // 7. Sorting test: by email asc, desc
  for (const [order_by, sort] of [
    ["email", "asc"],
    ["email", "desc"],
    ["created_at", "asc"],
    ["created_at", "desc"],
  ] as const) {
    listing = await api.functional.todoApp.admin.admins.index(connection, {
      body: {
        order_by,
        sort,
      } satisfies ITodoAppAdmin.IRequest,
    });
    typia.assert(listing);
    if (listing.data.length >= 2) {
      for (let i = 1; i < listing.data.length; i++) {
        const prev = listing.data[i - 1];
        const curr = listing.data[i];
        if (order_by === "email") {
          if (sort === "asc") {
            TestValidator.predicate(
              `email asc sorting [${i}]`,
              prev.email <= curr.email,
            );
          } else {
            TestValidator.predicate(
              `email desc sorting [${i}]`,
              prev.email >= curr.email,
            );
          }
        } else {
          // created_at
          if (sort === "asc") {
            TestValidator.predicate(
              `created_at asc sorting [${i}]`,
              prev.created_at <= curr.created_at,
            );
          } else {
            TestValidator.predicate(
              `created_at desc sorting [${i}]`,
              prev.created_at >= curr.created_at,
            );
          }
        }
      }
    }
  }

  // 8. Attempt listing with unauthenticated connection (should fail)
  await TestValidator.error("unauthenticated admin listing fails", async () => {
    await api.functional.todoApp.admin.admins.index(unauthConn, {
      body: {} satisfies ITodoAppAdmin.IRequest,
    });
  });
}
