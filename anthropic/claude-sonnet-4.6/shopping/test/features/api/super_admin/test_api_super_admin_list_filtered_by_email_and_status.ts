import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdmin";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_list_filtered_by_email_and_status(
  connection: api.IConnection,
): Promise<void> {
  // -----------------------------------------------------------------------
  // 1. Setup: Register the actor (superAdminA) who will perform searches
  // -----------------------------------------------------------------------
  const beforeRegistration = new Date().toISOString();
  const superAdminAConnection: api.IConnection = { host: connection.host };
  const uniqueDomain = `uniquedomain${RandomGenerator.alphabets(6)}.com`;
  const otherDomain = `otherdomain${RandomGenerator.alphabets(6)}.com`;
  const superAdminAEmail = typia.random<string & tags.Format<"email">>();
  await authorize_super_admin_join(superAdminAConnection, {
    body: {
      email: superAdminAEmail,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // -----------------------------------------------------------------------
  // 2. Register superAdminB with a unique domain email
  // -----------------------------------------------------------------------
  const superAdminBConnection: api.IConnection = { host: connection.host };
  const superAdminBEmail =
    `admin_${RandomGenerator.alphabets(5)}@${uniqueDomain}` as string &
      tags.Format<"email">;
  await authorize_super_admin_join(superAdminBConnection, {
    body: {
      email: superAdminBEmail,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // -----------------------------------------------------------------------
  // 3. Register superAdminC with a different domain email
  // -----------------------------------------------------------------------
  const superAdminCConnection: api.IConnection = { host: connection.host };
  const superAdminCEmail =
    `admin_${RandomGenerator.alphabets(5)}@${otherDomain}` as string &
      tags.Format<"email">;
  await authorize_super_admin_join(superAdminCConnection, {
    body: {
      email: superAdminCEmail,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const afterRegistration = new Date().toISOString();
  // -----------------------------------------------------------------------
  // 4. Email Partial Match Filter Test: filter by uniqueDomain
  // -----------------------------------------------------------------------
  const filteredByUniqueEmail =
    await api.functional.shoppingMall.superAdmin.superAdmins.index(
      superAdminAConnection,
      {
        body: {
          email: uniqueDomain,
          limit: 100,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(filteredByUniqueEmail);
  // All returned accounts must contain the unique domain in their email
  TestValidator.predicate(
    "all results match unique domain email filter",
    filteredByUniqueEmail.data.every((admin) =>
      admin.email.toLowerCase().includes(uniqueDomain.toLowerCase()),
    ),
  );
  // superAdminB should be in results
  TestValidator.predicate(
    "superAdminB appears in unique domain filtered results",
    filteredByUniqueEmail.data.some(
      (admin) => admin.email === superAdminBEmail,
    ),
  );
  // superAdminC (different domain) should NOT be in results
  TestValidator.predicate(
    "superAdminC excluded from unique domain filtered results",
    !filteredByUniqueEmail.data.some(
      (admin) => admin.email === superAdminCEmail,
    ),
  );
  // -----------------------------------------------------------------------
  // 5. Email Partial Match Filter Test: filter by otherDomain
  // -----------------------------------------------------------------------
  const filteredByOtherEmail =
    await api.functional.shoppingMall.superAdmin.superAdmins.index(
      superAdminAConnection,
      {
        body: {
          email: otherDomain,
          limit: 100,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(filteredByOtherEmail);
  // superAdminC should be in results
  TestValidator.predicate(
    "superAdminC appears in other domain filtered results",
    filteredByOtherEmail.data.some((admin) => admin.email === superAdminCEmail),
  );
  // superAdminB should NOT be in results
  TestValidator.predicate(
    "superAdminB excluded from other domain filtered results",
    !filteredByOtherEmail.data.some(
      (admin) => admin.email === superAdminBEmail,
    ),
  );
  // -----------------------------------------------------------------------
  // 6. Active/Inactive Status Filter Test: isActive: true
  // -----------------------------------------------------------------------
  const activeAdmins =
    await api.functional.shoppingMall.superAdmin.superAdmins.index(
      superAdminAConnection,
      {
        body: {
          isActive: true,
          limit: 100,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(activeAdmins);
  // All returned accounts must have deletedAt === null (active)
  TestValidator.predicate(
    "all active-filtered admins have null deletedAt",
    activeAdmins.data.every((admin) => admin.deletedAt === null),
  );
  // Our newly registered accounts should appear among active admins
  TestValidator.predicate(
    "superAdminA appears in active admins list",
    activeAdmins.data.some((admin) => admin.email === superAdminAEmail),
  );
  TestValidator.predicate(
    "superAdminB appears in active admins list",
    activeAdmins.data.some((admin) => admin.email === superAdminBEmail),
  );
  TestValidator.predicate(
    "superAdminC appears in active admins list",
    activeAdmins.data.some((admin) => admin.email === superAdminCEmail),
  );
  // -----------------------------------------------------------------------
  // 7. Active/Inactive Status Filter Test: isActive: false
  // -----------------------------------------------------------------------
  const inactiveAdmins =
    await api.functional.shoppingMall.superAdmin.superAdmins.index(
      superAdminAConnection,
      {
        body: {
          isActive: false,
          limit: 100,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(inactiveAdmins);
  // All returned accounts must have non-null deletedAt (inactive)
  TestValidator.predicate(
    "all inactive-filtered admins have non-null deletedAt",
    inactiveAdmins.data.every((admin) => admin.deletedAt !== null),
  );
  // -----------------------------------------------------------------------
  // 8. No filter (isActive omitted): all registered accounts appear
  // -----------------------------------------------------------------------
  const allAdmins =
    await api.functional.shoppingMall.superAdmin.superAdmins.index(
      superAdminAConnection,
      {
        body: {
          limit: 100,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(allAdmins);
  // All 3 registered accounts should appear when no filter applied
  TestValidator.predicate(
    "superAdminA appears in unfiltered list",
    allAdmins.data.some((admin) => admin.email === superAdminAEmail),
  );
  TestValidator.predicate(
    "superAdminB appears in unfiltered list",
    allAdmins.data.some((admin) => admin.email === superAdminBEmail),
  );
  TestValidator.predicate(
    "superAdminC appears in unfiltered list",
    allAdmins.data.some((admin) => admin.email === superAdminCEmail),
  );
  // -----------------------------------------------------------------------
  // 9. Date Range Filter Test: range covering registration time
  // -----------------------------------------------------------------------
  const filteredByDateRange =
    await api.functional.shoppingMall.superAdmin.superAdmins.index(
      superAdminAConnection,
      {
        body: {
          createdAtFrom: beforeRegistration,
          createdAtTo: afterRegistration,
          limit: 100,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(filteredByDateRange);
  // Our registered accounts should appear in the date range
  TestValidator.predicate(
    "at least one registered admin appears in date range filter",
    filteredByDateRange.data.some(
      (admin) =>
        admin.email === superAdminAEmail ||
        admin.email === superAdminBEmail ||
        admin.email === superAdminCEmail,
    ),
  );
  // -----------------------------------------------------------------------
  // 10. Date Range Filter Test: future date range — expect empty results
  // -----------------------------------------------------------------------
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const filteredByFutureDate =
    await api.functional.shoppingMall.superAdmin.superAdmins.index(
      superAdminAConnection,
      {
        body: {
          createdAtFrom: futureDate,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(filteredByFutureDate);
  TestValidator.equals(
    "future date filter returns zero records",
    filteredByFutureDate.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date filter returns empty data array",
    filteredByFutureDate.data.length,
    0,
  );
  // -----------------------------------------------------------------------
  // 11. Combined Filter Test: email + isActive: true
  // -----------------------------------------------------------------------
  const combinedFilter =
    await api.functional.shoppingMall.superAdmin.superAdmins.index(
      superAdminAConnection,
      {
        body: {
          email: uniqueDomain,
          isActive: true,
          limit: 100,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // All results must match email partial filter AND be active
  TestValidator.predicate(
    "combined filter: all results match unique domain",
    combinedFilter.data.every((admin) =>
      admin.email.toLowerCase().includes(uniqueDomain.toLowerCase()),
    ),
  );
  TestValidator.predicate(
    "combined filter: all results are active (deletedAt null)",
    combinedFilter.data.every((admin) => admin.deletedAt === null),
  );
  // superAdminB (active + unique domain) should be in results
  TestValidator.predicate(
    "combined filter: superAdminB appears in results",
    combinedFilter.data.some((admin) => admin.email === superAdminBEmail),
  );
}
