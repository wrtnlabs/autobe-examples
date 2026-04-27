import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_list_filter_sort_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  //----
  // Setup: Create 3 administrators and promote AdminA to super admin
  //----
  // 1. AdminA - will be promoted to super admin
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminA = await authorize_administrator_join(adminAConnection, {
    body: {
      email: "admin.a@test.com",
      password: "password123",
      href: "http://localhost/",
      referrer: "http://localhost/",
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminA);
  // 2. AdminB - regular admin
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminB = await authorize_administrator_join(adminBConnection, {
    body: {
      email: "admin.b@test.com",
      password: "password123",
      href: "http://localhost/",
      referrer: "http://localhost/",
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminB);
  // 3. AdminC - regular admin
  const adminCConnection: api.IConnection = { host: connection.host };
  const adminC = await authorize_administrator_join(adminCConnection, {
    body: {
      email: "admin.c@test.com",
      password: "password123",
      href: "http://localhost/",
      referrer: "http://localhost/",
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminC);
  // 4. Promote AdminA to super administrator
  //    adminAConnection now gets super admin auth token
  const superAdminA = await authorize_super_administrator_join(
    adminAConnection,
    {
      body: {
        administrator_id: adminA.id,
        email: "superadmin.a@test.com",
        password: "password123",
        href: "http://localhost/",
        referrer: "http://localhost/",
      },
    },
  );
  typia.assert(superAdminA);
  //----
  // Shared pagination helper
  //----
  const superAdminConn: api.IConnection = adminAConnection;
  //----
  // (1) Grade filter 'regular'
  //----
  const regularPage =
    await api.functional.eCommerceMall.superAdministrator.administrators.index(
      superAdminConn,
      {
        body: {
          grade: "regular" as const,
          sort_field: "email" as const,
          sort_direction: "asc" as const,
        } satisfies IECommerceMallAdministrator.IRequest,
      },
    );
  typia.assert(regularPage);
  TestValidator.equals("regular grade count", regularPage.data.length, 2);
  TestValidator.predicate(
    "no super admin in regular results",
    regularPage.data.every((a) => a.grade === "regular"),
  );
  //----
  // (2) Grade filter 'super'
  //----
  const superPage =
    await api.functional.eCommerceMall.superAdministrator.administrators.index(
      superAdminConn,
      {
        body: {
          grade: "super" as const,
        } satisfies IECommerceMallAdministrator.IRequest,
      },
    );
  typia.assert(superPage);
  TestValidator.equals("super grade count", superPage.data.length, 1);
  TestValidator.equals("super grade value", superPage.data[0]!.grade, "super");
  //----
  // (3) Email partial search 'admin.b'
  //----
  const searchPage =
    await api.functional.eCommerceMall.superAdministrator.administrators.index(
      superAdminConn,
      {
        body: {
          search: "admin.b",
        } satisfies IECommerceMallAdministrator.IRequest,
      },
    );
  typia.assert(searchPage);
  TestValidator.equals("search admin.b count", searchPage.data.length, 1);
  TestValidator.equals(
    "search admin.b email",
    searchPage.data[0]!.email,
    "admin.b@test.com",
  );
  //----
  // (4) Email search no match
  //----
  const noMatchPage =
    await api.functional.eCommerceMall.superAdministrator.administrators.index(
      superAdminConn,
      {
        body: {
          search: "nonexistent_admin_email",
        } satisfies IECommerceMallAdministrator.IRequest,
      },
    );
  typia.assert(noMatchPage);
  TestValidator.equals("no match count", noMatchPage.data.length, 0);
  TestValidator.equals("no match records", noMatchPage.pagination.records, 0);
  TestValidator.equals("no match pages", noMatchPage.pagination.pages, 0);
  //----
  // (5) Pagination limit=1, page=1, sort by email asc
  //----
  const page1 =
    await api.functional.eCommerceMall.superAdministrator.administrators.index(
      superAdminConn,
      {
        body: {
          limit: 1,
          page: 1,
          sort_field: "email" as const,
          sort_direction: "asc" as const,
        } satisfies IECommerceMallAdministrator.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page1 data length", page1.data.length, 1);
  TestValidator.equals("page1 pagination records", page1.pagination.records, 3);
  TestValidator.equals("page1 pagination pages", page1.pagination.pages, 3);
  TestValidator.equals("page1 pagination current", page1.pagination.current, 1);
  //----
  // (6) Pagination limit=1, page=2, sort by email asc
  //----
  const page2 =
    await api.functional.eCommerceMall.superAdministrator.administrators.index(
      superAdminConn,
      {
        body: {
          limit: 1,
          page: 2,
          sort_field: "email" as const,
          sort_direction: "asc" as const,
        } satisfies IECommerceMallAdministrator.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page2 data length", page2.data.length, 1);
  TestValidator.equals("page2 pagination records", page2.pagination.records, 3);
  TestValidator.equals("page2 pagination pages", page2.pagination.pages, 3);
  TestValidator.equals("page2 pagination current", page2.pagination.current, 2);
  TestValidator.notEquals(
    "page2 different from page1",
    page2.data[0]!.id,
    page1.data[0]!.id,
  );
  //----
  // (7) Sort by email ascending
  //----
  const ascPage =
    await api.functional.eCommerceMall.superAdministrator.administrators.index(
      superAdminConn,
      {
        body: {
          sort_field: "email" as const,
          sort_direction: "asc" as const,
        } satisfies IECommerceMallAdministrator.IRequest,
      },
    );
  typia.assert(ascPage);
  TestValidator.predicate("ascending email order", () => {
    const emails = ascPage.data.map((a) => a.email);
    for (let i = 1; i < emails.length; i++)
      if (emails[i - 1]! > emails[i]!) return false;
    return true;
  });
  //----
  // (8) Sort by email descending
  //----
  const descPage =
    await api.functional.eCommerceMall.superAdministrator.administrators.index(
      superAdminConn,
      {
        body: {
          sort_field: "email" as const,
          sort_direction: "desc" as const,
        } satisfies IECommerceMallAdministrator.IRequest,
      },
    );
  typia.assert(descPage);
  TestValidator.predicate("descending email order", () => {
    const emails = descPage.data.map((a) => a.email);
    for (let i = 1; i < emails.length; i++)
      if (emails[i - 1]! < emails[i]!) return false;
    return true;
  });
  //----
  // (9) Date range filter (all admins)
  //----
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 86400000);
  const dateRangePage =
    await api.functional.eCommerceMall.superAdministrator.administrators.index(
      superAdminConn,
      {
        body: {
          created_at_from: oneDayAgo.toISOString(),
          created_at_to: now.toISOString(),
        } satisfies IECommerceMallAdministrator.IRequest,
      },
    );
  typia.assert(dateRangePage);
  TestValidator.equals("date range count", dateRangePage.data.length, 3);
  //----
  // (10) Date range with no overlap (future date)
  //----
  const futurePage =
    await api.functional.eCommerceMall.superAdministrator.administrators.index(
      superAdminConn,
      {
        body: {
          created_at_from: "2099-01-01T00:00:00.000Z",
        } satisfies IECommerceMallAdministrator.IRequest,
      },
    );
  typia.assert(futurePage);
  TestValidator.equals("future date count", futurePage.data.length, 0);
  TestValidator.equals("future date records", futurePage.pagination.records, 0);
}
