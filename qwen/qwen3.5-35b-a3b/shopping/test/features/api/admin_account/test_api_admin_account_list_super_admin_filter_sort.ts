import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEAdminGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdminGrade";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_account_list_super_admin_filter_sort(
  connection: api.IConnection,
): Promise<void> {
  // Step 1-4: Create test admin accounts
  const superAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminConnections: api.IConnection[] = [];
  // Create first regular admin
  const password1 = RandomGenerator.alphaNumeric(16);
  regularAdminConnections[0] = { host: connection.host };
  const regularAdmin1 = await authorize_admin_join(regularAdminConnections[0], {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password1,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(regularAdmin1);
  // Create second regular admin
  const password2 = RandomGenerator.alphaNumeric(16);
  regularAdminConnections[1] = { host: connection.host };
  const regularAdmin2 = await authorize_admin_join(regularAdminConnections[1], {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password2,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(regularAdmin2);
  // Create super admin
  const superPassword = RandomGenerator.alphaNumeric(16);
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: superPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create third regular admin
  const password3 = RandomGenerator.alphaNumeric(16);
  regularAdminConnections[2] = { host: connection.host };
  const regularAdmin3 = await authorize_admin_join(regularAdminConnections[2], {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password3,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(regularAdmin3);
  // Re-login as super admin to use for listing
  const superAdminListConnection: api.IConnection = { host: connection.host };
  const loggedSuperAdmin = await authorize_admin_login(
    superAdminListConnection,
    {
      body: {
        email: superAdmin.email,
        password: superPassword,
      },
    },
  );
  typia.assert(loggedSuperAdmin);
  // Step 5-7: Test filtering by grade='regular'
  const regularFilter = await api.functional.ecommerceMall.admin.admins.index(
    superAdminListConnection,
    {
      body: {
        grade: "regular",
        limit: 100,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(regularFilter);
  // Verify returns 3 regular admins
  TestValidator.equals(
    "returns 3 regular admins count",
    regularFilter.pagination.records,
    3,
  );
  TestValidator.equals("has 3 data records", regularFilter.data.length, 3);
  // Step 8-9: Test sorting by email ascending
  const emailSortedAsc = await api.functional.ecommerceMall.admin.admins.index(
    superAdminListConnection,
    {
      body: {
        grade: "regular",
        sort: "email",
        sortOrder: "asc",
        limit: 100,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(emailSortedAsc);
  // Verify sorted by email ascending
  const emailsAsc = emailSortedAsc.data.map((a) => a.email);
  const sortedEmailsAsc = [...emailsAsc].sort();
  TestValidator.equals(
    "email ascending sort order",
    emailsAsc,
    sortedEmailsAsc,
  );
  // Step 10-11: Test sorting by grade descending
  const gradeSortedDesc = await api.functional.ecommerceMall.admin.admins.index(
    superAdminListConnection,
    {
      body: {
        sort: "grade",
        sortOrder: "desc",
        limit: 100,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(gradeSortedDesc);
  // Verify grade descending sort has data
  TestValidator.predicate(
    "grade descending sort returns data",
    gradeSortedDesc.data.length >= 1,
  );
  // Step 12-13: Test filtering by isBanned=false
  const bannedFalseFilter =
    await api.functional.ecommerceMall.admin.admins.index(
      superAdminListConnection,
      {
        body: {
          isBanned: false,
          limit: 100,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(bannedFalseFilter);
  // Verify all returned accounts are not banned
  const allNotBanned = bannedFalseFilter.data.every(
    (admin) => admin.is_banned === false,
  );
  TestValidator.predicate("all accounts are not banned", allNotBanned);
  TestValidator.equals(
    "non-banned pagination records match",
    bannedFalseFilter.pagination.records,
    bannedFalseFilter.data.length,
  );
}