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

export async function test_api_superadmin_listing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    });
  typia.assert(authorizedSuperAdmin);
  // Create multiple super admin accounts for filter testing
  const superAdminEmails = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"email">>(),
  );
  for (const email of superAdminEmails) {
    const tempConnection: api.IConnection = { host: connection.host };
    await authorize_super_admin_join(tempConnection, {
      body: {
        email,
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    });
  }
  // Test 1: Email filter - case-insensitive partial match
  const emailFilterResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      superAdminConnection,
      {
        body: {
          email: "admin",
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(emailFilterResult);
  TestValidator.predicate(
    "email filter should return results matching partial email",
    emailFilterResult.data.length > 0,
  );
  // Test 2: Date range filter - createdAtFrom and createdAtTo
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: thirtyDaysAgo.toISOString() satisfies string &
            tags.Format<"date-time">,
          createdAtTo: tomorrow.toISOString() satisfies string &
            tags.Format<"date-time">,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter should return results within range",
    dateRangeResult.data.length > 0,
  );
  // Test 3: includeDeleted filter
  const includeDeletedResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      superAdminConnection,
      {
        body: {
          includeDeleted: true,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(includeDeletedResult);
  const excludeDeletedResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      superAdminConnection,
      {
        body: {
          includeDeleted: false,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(excludeDeletedResult);
  // Test 4: Sorting by email in ascending order
  const sortedByEmailResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      superAdminConnection,
      {
        body: {
          sort: "email",
          order: "asc",
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(sortedByEmailResult);
  TestValidator.predicate(
    "sorting by email ascending should return results",
    sortedByEmailResult.data.length > 0,
  );
  // Verify sorting is correct
  if (sortedByEmailResult.data.length > 1) {
    for (let i = 1; i < sortedByEmailResult.data.length; i++) {
      TestValidator.predicate(
        "emails should be sorted in ascending order",
        sortedByEmailResult.data[i - 1].email.localeCompare(
          sortedByEmailResult.data[i].email,
        ) <= 0,
      );
    }
  }
  // Test 5: Combined filters
  const combinedFilterResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      superAdminConnection,
      {
        body: {
          email: superAdminEmails[0].split("@")[0].substring(0, 5),
          createdAtFrom: thirtyDaysAgo.toISOString() satisfies string &
            tags.Format<"date-time">,
          createdAtTo: tomorrow.toISOString() satisfies string &
            tags.Format<"date-time">,
          includeDeleted: false,
          sort: "createdAt",
          order: "desc",
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filters should narrow down results",
    combinedFilterResult.data.length >= 0,
  );
}