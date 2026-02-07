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

export async function test_api_super_admin_retrieve_user_ban_history(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  // Generate random user ID for testing
  const testUserId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve ban history for the test user
  const result =
    await api.functional.discussionBoard.superAdmin.users.bans.index(
      superAdminConnection,
      {
        userId: testUserId,
      },
    );
  // Validate response structure
  typia.assert(result);
  // Validate pagination fields exist
  TestValidator.predicate("has pagination", result.pagination !== undefined);
  TestValidator.predicate("has records", result.pagination?.records >= 0);
  TestValidator.predicate("has pages", result.pagination?.pages >= 0);
  // Validate ban record summaries structure
  TestValidator.predicate("has data array", Array.isArray(result.data));
  // Validate each ban record summary has required fields
  for (const record of result.data) {
    typia.assert(record);
  }
}