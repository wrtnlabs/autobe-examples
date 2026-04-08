import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_listing_default_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const authorized: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SuperAdmin123!@#" as string & tags.Format<"password">,
        href: "/test" as string & tags.Format<"uri">,
        referrer: "/" as string & tags.Format<"uri">,
      },
    });
  // 2. Create connection with super admin authorization
  const superAdminConnection: api.IConnection = { host: connection.host };
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = authorized.token.access;
  // 3. Retrieve super admin list with default filters (empty body)
  const page: IPageIEcommerceMallSuperAdmin =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      superAdminConnection,
      {
        body: {},
      },
    );
  // 4. Validate response structure
  typia.assert(page);
  // 5. Verify pagination metadata using correct nested path: page.pagination.pagination
  TestValidator.equals(
    "has pagination metadata",
    page.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "current page is valid",
    page.pagination.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    page.pagination.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is valid",
    page.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is valid",
    page.pagination.pagination.pages >= 0,
  );
  // 6. Verify data array exists and contains at least the newly created super admin
  TestValidator.predicate("data array exists", Array.isArray(page.data));
  TestValidator.predicate(
    "has at least one super admin",
    page.data.length >= 1,
  );
  // 7. Verify all returned accounts are active (deletedAt is null)
  for (const admin of page.data) {
    TestValidator.equals(
      "super admin is active (deletedAt is null)",
      admin.deletedAt,
      null,
    );
    // 8. Verify required fields exist
    TestValidator.predicate(
      "id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(admin.id),
    );
    TestValidator.predicate("email exists", admin.email.length > 0);
    TestValidator.predicate(
      "createdAt is valid date-time",
      !isNaN(Date.parse(admin.createdAt)),
    );
    TestValidator.predicate(
      "updatedAt is valid date-time",
      !isNaN(Date.parse(admin.updatedAt)),
    );
    // 9. Verify password_hash is NOT included (type IEcommerceMallSuperAdmin does not have this field)
    // This is implicitly validated by typia.assert() matching the response type
  }
  // 10. Verify results are sorted by createdAt descending (newest first)
  if (page.data.length > 1) {
    for (let i = 1; i < page.data.length; i++) {
      const prev = new Date(page.data[i - 1].createdAt);
      const curr = new Date(page.data[i].createdAt);
      TestValidator.predicate(
        "results sorted by createdAt descending",
        prev >= curr,
      );
    }
  }
}
