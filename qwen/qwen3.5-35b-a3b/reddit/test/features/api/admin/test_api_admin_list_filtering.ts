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

export async function test_api_admin_list_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as main test admin
  const adminConnection: api.IConnection = { host: connection.host };
  const mainAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(mainAdmin);
  // 2. Create additional admin accounts
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: "admin1@test.com",
      password: "TestPass123!",
      username: "admin_test1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin2);
  const admin3Connection: api.IConnection = { host: connection.host };
  const admin3 = await authorize_admin_join(admin3Connection, {
    body: {
      email: "admin2@test.com",
      password: "TestPass123!",
      username: "admin_test2",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin3);
  const admin4Connection: api.IConnection = { host: connection.host };
  const admin4 = await authorize_admin_join(admin4Connection, {
    body: {
      email: "suspended@test.com",
      password: "TestPass123!",
      username: "admin_suspended",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin4);
  // 3. Test filtering by isActive=true
  const activeFilter: IRedditPlatformAdmin.IRequest = {
    isActive: true,
  };
  const activeResult = await api.functional.redditPlatform.admin.admins.index(
    adminConnection,
    { body: activeFilter },
  );
  typia.assert(activeResult);
  TestValidator.equals("active admins count", activeResult.data.length, 3);
  activeResult.data.forEach((admin) => {
    TestValidator.equals("admin is active", admin.is_active, true);
  });
  // 4. Test filtering by isActive=false
  const inactiveFilter: IRedditPlatformAdmin.IRequest = {
    isActive: false,
  };
  const inactiveResult = await api.functional.redditPlatform.admin.admins.index(
    adminConnection,
    { body: inactiveFilter },
  );
  typia.assert(inactiveResult);
  TestValidator.equals("inactive admins count", inactiveResult.data.length, 1);
  inactiveResult.data.forEach((admin) => {
    TestValidator.equals("admin is inactive", admin.is_active, false);
  });
  // 5. Test filtering by username (case-insensitive partial match)
  const usernameFilter: IRedditPlatformAdmin.IRequest = {
    username: "admin_test",
  };
  const usernameResult = await api.functional.redditPlatform.admin.admins.index(
    adminConnection,
    { body: usernameFilter },
  );
  typia.assert(usernameResult);
  TestValidator.equals(
    "username filter results",
    usernameResult.data.length,
    2,
  );
  usernameResult.data.forEach((admin) => {
    TestValidator.predicate(
      "admin matches username filter",
      admin.username.toLowerCase().includes("admin_test".toLowerCase()),
    );
  });
  // 6. Test filtering by email (case-insensitive partial match)
  const emailFilter: IRedditPlatformAdmin.IRequest = {
    email: "admin1",
  };
  const emailResult = await api.functional.redditPlatform.admin.admins.index(
    adminConnection,
    { body: emailFilter },
  );
  typia.assert(emailResult);
  TestValidator.equals("email filter results", emailResult.data.length, 1);
  emailResult.data.forEach((admin) => {
    TestValidator.predicate(
      "admin matches email filter",
      admin.email.toLowerCase().includes("admin1".toLowerCase()),
    );
  });
  // 7. Test filtering by createdAfter (recently created admins)
  const recentDate = new Date();
  const createdAfterFilter: IRedditPlatformAdmin.IRequest = {
    createdAfter: recentDate.toISOString(),
  };
  const createdAfterResult =
    await api.functional.redditPlatform.admin.admins.index(adminConnection, {
      body: createdAfterFilter,
    });
  typia.assert(createdAfterResult);
  createdAfterResult.data.forEach((admin) => {
    TestValidator.predicate(
      "admin created after filter date",
      new Date(admin.created_at).getTime() >= recentDate.getTime(),
    );
  });
  // 8. Test filtering by createdBefore (earlier admins)
  const earlierDate = new Date(recentDate.getTime() - 86400000); // 1 day ago
  const createdBeforeFilter: IRedditPlatformAdmin.IRequest = {
    createdBefore: earlierDate.toISOString(),
  };
  const createdBeforeResult =
    await api.functional.redditPlatform.admin.admins.index(adminConnection, {
      body: createdBeforeFilter,
    });
  typia.assert(createdBeforeResult);
  createdBeforeResult.data.forEach((admin) => {
    TestValidator.predicate(
      "admin created before filter date",
      new Date(admin.created_at).getTime() < earlierDate.getTime(),
    );
  });
  // 9. Test combined filters (isActive=true AND username=admin_test)
  const combinedFilter: IRedditPlatformAdmin.IRequest = {
    isActive: true,
    username: "admin_test",
  };
  const combinedResult = await api.functional.redditPlatform.admin.admins.index(
    adminConnection,
    { body: combinedFilter },
  );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filter results",
    combinedResult.data.length,
    2,
  );
  combinedResult.data.forEach((admin) => {
    TestValidator.equals(
      "admin matches combined filters",
      admin.is_active,
      true,
    );
    TestValidator.predicate(
      "admin matches username in combined filter",
      admin.username.toLowerCase().includes("admin_test".toLowerCase()),
    );
  });
  // 10. Verify pagination works correctly with filtered results
  const paginatedFilter: IRedditPlatformAdmin.IRequest = {
    isActive: true,
    page: 1,
    limit: 1,
  };
  const paginatedResult =
    await api.functional.redditPlatform.admin.admins.index(adminConnection, {
      body: paginatedFilter,
    });
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit applied",
    paginatedResult.data.length,
    1,
  );
  TestValidator.equals(
    "pagination records reflects filtered count",
    paginatedResult.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages correct",
    paginatedResult.pagination.pages,
    3,
  );
  // 11. Test empty result with restrictive filter
  const emptyFilter: IRedditPlatformAdmin.IRequest = {
    username: "nonexistent_admin",
  };
  const emptyResult = await api.functional.redditPlatform.admin.admins.index(
    adminConnection,
    { body: emptyFilter },
  );
  typia.assert(emptyResult);
  TestValidator.equals("empty result data array", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
}
