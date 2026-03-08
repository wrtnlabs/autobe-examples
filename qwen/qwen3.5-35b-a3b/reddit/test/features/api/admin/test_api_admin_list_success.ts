import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAdmin";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication with known password
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(12);
  const adminAuthorization = await authorize_admin_join(connection, {
    body: {
      email: adminEmail,
      password: joinPassword,
      username: adminUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminAuthorization);
  // 2. Create admin-specific connection for API calls
  const adminConnection: api.IConnection = { host: connection.host };
  // Login using the same credentials used for join
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: joinPassword,
    },
  });
  typia.assert(adminLogin);
  // 3. Call PATCH /redditPlatform/admin/admins with default filters
  const response = await api.functional.redditPlatform.admin.admins.index(
    adminConnection,
    {
      body: {} satisfies IRedditPlatformAdmin.IRequest,
    },
  );
  typia.assert(response);
  // 4. Verify at least one admin is returned
  TestValidator.predicate(
    "at least one admin returned",
    response.data.length >= 1,
  );
  // 5. Verify pagination metadata accuracy
  TestValidator.equals(
    "pagination records count matches data length",
    response.pagination.records,
    response.data.length,
  );
  // 6. Verify current page is 1 (default)
  TestValidator.equals(
    "current page is default 1",
    response.pagination.current,
    1,
  );
  // 7. Verify limit is default 20 or reasonable value
  TestValidator.predicate(
    "limit is valid",
    response.pagination.limit > 0 && response.pagination.limit <= 100,
  );
  // 8. Verify pages calculation is correct
  const expectedPages = Math.max(
    1,
    Math.ceil(response.data.length / response.pagination.limit),
  );
  TestValidator.equals(
    "pages calculated correctly",
    response.pagination.pages,
    expectedPages,
  );
  // 9. Verify all admin summaries have required fields and no sensitive data
  for (const admin of response.data) {
    typia.assert(admin);
    TestValidator.predicate(
      "admin has valid uuid id",
      /^[0-9a-f-]{36}$/i.test(admin.id),
    );
    TestValidator.predicate(
      "admin has username",
      admin.username !== undefined && typeof admin.username === "string",
    );
    TestValidator.predicate(
      "admin has display_name",
      admin.display_name !== undefined &&
        typeof admin.display_name === "string",
    );
    TestValidator.predicate(
      "admin has valid email",
      admin.email !== undefined &&
        typeof admin.email === "string" &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email),
    );
    TestValidator.predicate(
      "admin has is_active boolean",
      admin.is_active !== undefined && typeof admin.is_active === "boolean",
    );
    TestValidator.predicate(
      "admin has valid date-time created_at",
      admin.created_at !== undefined &&
        typeof admin.created_at === "string" &&
        !Number.isNaN(Date.parse(admin.created_at)),
    );
    // Verify no sensitive fields are exposed
    TestValidator.predicate(
      "no password_hash in response",
      !("password_hash" in admin),
    );
  }
}