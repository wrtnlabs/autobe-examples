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
 * Test creating a permanent ban record with no expiration.
 * 1. Authenticate as super administrator
 * 2. Create permanent ban with null ban_duration_days
 * 3. Validate permanent ban characteristics (expires_at null, active status)
 */
export async function test_api_ban_records_superadmin_permanent_ban(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create permanent ban record
  const banRecord =
    await generate_random_discussion_board_super_admin_ban_records_create(
      superAdminConnection,
      {
        body: {
          ban_reason: "Multiple severe violations",
          ban_duration_days: null,
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // Validate permanent ban characteristics
  TestValidator.equals(
    "ban status should be active",
    banRecord.ban_status,
    "active",
  );
  TestValidator.equals(
    "expires_at should be null for permanent ban",
    banRecord.expires_at,
    null,
  );
  TestValidator.equals(
    "ban_duration_days should be null for permanent ban",
    banRecord.ban_duration_days,
    null,
  );
  TestValidator.predicate(
    "created_at should be populated",
    banRecord.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be populated",
    banRecord.updated_at.length > 0,
  );
  TestValidator.equals(
    "ban_reason should match input",
    banRecord.ban_reason,
    "Multiple severe violations",
  );
}
