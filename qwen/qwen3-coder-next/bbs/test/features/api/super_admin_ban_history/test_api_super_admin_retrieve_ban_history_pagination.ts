import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBansBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_retrieve_ban_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin user for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(superAdmin);
  // Step 2: Create a test user for ban history
  const testUserConnection: api.IConnection = { host: connection.host };
  const testUser = await api.functional.discussionBoard.auth.super_admin.join(
    testUserConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(testUser);
  // Step 3: Test pagination with various parameters
  // Test 3.1: Retrieve ban history with default pagination
  const defaultResult =
    await api.functional.discussionBoard.superAdmin.users.bans.index(
      superAdminConnection,
      {
        userId: typia.random<string>(),
      },
    );
  typia.assert(defaultResult);
  // Validate pagination metadata structure
  TestValidator.equals(
    "default pagination has correct structure",
    typeof defaultResult.pagination.current,
    "number",
  );
  TestValidator.equals(
    "default pagination limit > 0",
    defaultResult.pagination.limit > 0,
    true,
  );
  TestValidator.predicate(
    "default pagination records >= 0",
    () => defaultResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pagination pages >= 0",
    () => defaultResult.pagination.pages >= 0,
  );
  // Test 3.2: Verify data array structure and types
  TestValidator.predicate("data is array", () =>
    Array.isArray(defaultResult.data),
  );
  // Test 3.3: Test with another random user ID
  const anotherUserResult =
    await api.functional.discussionBoard.superAdmin.users.bans.index(
      superAdminConnection,
      {
        userId: typia.random<string>(),
      },
    );
  typia.assert(anotherUserResult);
  // Test 3.4: Verify empty data array case handling
  TestValidator.predicate(
    "empty data array handled correctly",
    () =>
      anotherUserResult.data === undefined ||
      Array.isArray(anotherUserResult.data),
  );
  // Test 3.5: Verify all ban records have correct structure
  if (anotherUserResult.data && anotherUserResult.data.length > 0) {
    anotherUserResult.data.forEach((record) => {
      typia.assert<IPageIDiscussionBoardBansBanRecord.ISummary>(record);
    });
  }
}
