import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_listing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create multiple super admin accounts for testing
  const createdAdmins: string[] = [];
  const adminEmails: string[] = [];
  for (let i = 0; i < 5; i++) {
    const email = `admin.test.${RandomGenerator.alphaNumeric(6)}@example.com`;
    const adminConn: api.IConnection = { host: connection.host };
    const authorized = await authorize_super_admin_join(adminConn, {
      body: {
        email: email,
        password: `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    createdAdmins.push(authorized.id);
    adminEmails.push(email);
  }
  // 3. Test listing with email filter (partial matching)
  const emailFilterResult =
    await api.functional.ecommerceMall.superAdmin.superAdmins.index(
      superAdminConnection,
      {
        body: {
          email: "admin.test.",
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(emailFilterResult);
  // Validate response structure
  TestValidator.predicate("has data array", emailFilterResult.data.length > 0);
  TestValidator.predicate("has pagination", !!emailFilterResult.pagination);
  // Verify all returned emails contain the filter pattern
  for (const admin of emailFilterResult.data) {
    TestValidator.predicate(
      `email contains pattern: ${admin.email}`,
      admin.email.includes("admin.test."),
    );
  }
  // 4. Test listing with status filter (active only)
  const statusFilterResult =
    await api.functional.ecommerceMall.superAdmin.superAdmins.index(
      superAdminConnection,
      {
        body: {
          status: "active",
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(statusFilterResult);
  // Validate all returned accounts are active (not deleted)
  for (const admin of statusFilterResult.data) {
    TestValidator.equals("account is active", admin.isDeleted, false);
  }
  // 5. Test listing with date range filter
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerceMall.superAdmin.superAdmins.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: oneMonthAgo.toISOString() as string &
            tags.Format<"date-time">,
          createdAtTo: now.toISOString() as string & tags.Format<"date-time">,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Validate all dates are within range
  for (const admin of dateRangeResult.data) {
    const createdAt = new Date(admin.createdAt);
    TestValidator.predicate(
      `createdAt within range: ${admin.createdAt}`,
      createdAt >= oneMonthAgo && createdAt <= now,
    );
  }
  // 6. Test pagination (page 1, limit 10)
  const paginationResult =
    await api.functional.ecommerceMall.superAdmin.superAdmins.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(paginationResult);
  // Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", paginationResult.pagination.limit, 10);
  TestValidator.predicate(
    "has records count",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has pages count",
    paginationResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length <= limit",
    paginationResult.data.length <= 10,
  );
  // Calculate expected pages
  const expectedPages = Math.ceil(paginationResult.pagination.records / 10);
  TestValidator.equals(
    "pages calculated correctly",
    paginationResult.pagination.pages,
    expectedPages,
  );
  // 7. Test sorting by email ascending
  const sortedResult =
    await api.functional.ecommerceMall.superAdmin.superAdmins.index(
      superAdminConnection,
      {
        body: {
          sort: "email",
          order: "ASC",
          limit: 10,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(sortedResult);
  // Validate alphabetical ordering
  if (sortedResult.data.length > 1) {
    for (let i = 0; i < sortedResult.data.length - 1; i++) {
      const current = sortedResult.data[i].email.toLowerCase();
      const next = sortedResult.data[i + 1].email.toLowerCase();
      TestValidator.predicate(
        `email sorted ASC: "${current}" <= "${next}"`,
        current <= next,
      );
    }
  }
  // 8. Test combined filters (email + status + pagination)
  const combinedResult =
    await api.functional.ecommerceMall.superAdmin.superAdmins.index(
      superAdminConnection,
      {
        body: {
          email: "admin",
          status: "active",
          page: 1,
          limit: 5,
          sort: "createdAt",
          order: "DESC",
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Validate combined results
  TestValidator.predicate(
    "has combined results",
    combinedResult.data.length > 0,
  );
  TestValidator.equals("limit is 5", combinedResult.pagination.limit, 5);
  // Verify all filters applied correctly
  for (const admin of combinedResult.data) {
    TestValidator.equals("account is active", admin.isDeleted, false);
    TestValidator.predicate(
      `email contains admin: ${admin.email}`,
      admin.email.includes("admin"),
    );
  }
}
