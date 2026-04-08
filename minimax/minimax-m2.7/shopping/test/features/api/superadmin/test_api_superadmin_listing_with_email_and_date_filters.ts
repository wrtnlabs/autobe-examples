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

export async function test_api_superadmin_listing_with_email_and_date_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authorized);
  // 2. Create multiple super admin accounts
  const createdAdmins: IEcommerceMallSuperAdmin[] = [];
  // Create first admin
  const testAdminConnection: api.IConnection = { host: connection.host };
  const testAdmin = await authorize_super_admin_join(testAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: (RandomGenerator.alphaNumeric(12) + "!Aa1") as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(testAdmin);
  createdAdmins.push(testAdmin);
  // Create second admin
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_super_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: (RandomGenerator.alphaNumeric(12) + "!Bb2") as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(admin2);
  createdAdmins.push(admin2);
  // Create third admin
  const admin3Connection: api.IConnection = { host: connection.host };
  const admin3 = await authorize_super_admin_join(admin3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: (RandomGenerator.alphaNumeric(12) + "!Cc3") as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(admin3);
  createdAdmins.push(admin3);
  // 3. Define date range for filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // 4. Call the PATCH endpoint with email and date filters
  const filteredResponse =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      superAdminConnection,
      {
        body: {
          search: "admin",
          createdAtFrom: thirtyDaysAgo.toISOString() as string &
            tags.Format<"date-time">,
          createdAtTo: tomorrow.toISOString() as string &
            tags.Format<"date-time">,
          sort: "created_at",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // 5. Validate response structure
  TestValidator.equals(
    "has pagination metadata",
    filteredResponse.pagination !== null &&
      filteredResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(filteredResponse.data),
    true,
  );
  // 6. Validate pagination metadata (access via correct nested path)
  TestValidator.predicate(
    "current page is valid",
    filteredResponse.pagination.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    filteredResponse.pagination.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is valid",
    filteredResponse.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    filteredResponse.pagination.pagination.pages >= 0,
  );
  // 7. Validate all returned admins match the email pattern filter
  for (const admin of filteredResponse.data) {
    const emailLower = admin.email.toLowerCase();
    TestValidator.predicate(
      `admin email "${admin.email}" contains "admin" pattern`,
      emailLower.includes("admin"),
    );
    // Validate within date range
    const createdAt = new Date(admin.createdAt);
    TestValidator.predicate(
      `admin created at ${admin.createdAt} is within date range`,
      createdAt >= thirtyDaysAgo && createdAt <= tomorrow,
    );
  }
  // 8. Validate sorting (ascending by created_at)
  if (filteredResponse.data.length > 1) {
    for (let i = 1; i < filteredResponse.data.length; i++) {
      const prevCreatedAt = new Date(filteredResponse.data[i - 1].createdAt);
      const currCreatedAt = new Date(filteredResponse.data[i].createdAt);
      TestValidator.predicate(
        `admin at index ${i} has created_at >= previous admin`,
        currCreatedAt >= prevCreatedAt,
      );
    }
  }
  // 9. Validate pagination reflects filtered results
  TestValidator.predicate(
    "records count is at least the number of admins we created",
    filteredResponse.pagination.pagination.records >= createdAdmins.length,
  );
}
