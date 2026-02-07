import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_ban_records_create } from "../../../generate/generate_random_discussion_board_super_admin_ban_records_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test creating a temporary ban record with specific duration.
 * 1. Create super administrator account and authenticate
 * 2. Create ban record with ban_reason 'Violation of community guidelines', ban_duration_days 30, and ban_status 'active'
 * 3. Validate response contains generated UUID, calculated expires_at timestamp, and correct ban status
 * 4. Verify ban record persists with proper administrator attribution
 */
export async function test_api_ban_records_superadmin_temporary_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create ban record with specific parameters using utility function
  const banRecord =
    await generate_random_discussion_board_super_admin_ban_records_create(
      superAdminConnection,
      {
        body: {
          ban_reason: "Violation of community guidelines",
          ban_duration_days: 30,
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 3. Validate response properties
  TestValidator.equals(
    "ban_reason matches input",
    banRecord.ban_reason,
    "Violation of community guidelines",
  );
  TestValidator.equals(
    "ban_duration_days matches input",
    banRecord.ban_duration_days,
    30,
  );
  TestValidator.equals("ban_status is active", banRecord.ban_status, "active");
  // 4. Validate expires_at calculation (created_at + 30 days)
  const createdAt = new Date(banRecord.created_at);
  const expectedExpiresAt = new Date(
    createdAt.getTime() + 30 * 24 * 60 * 60 * 1000,
  );
  const actualExpiresAt = new Date(banRecord.expires_at!);
  TestValidator.equals(
    "expires_at is calculated correctly",
    actualExpiresAt.toISOString(),
    expectedExpiresAt.toISOString(),
  );
}
