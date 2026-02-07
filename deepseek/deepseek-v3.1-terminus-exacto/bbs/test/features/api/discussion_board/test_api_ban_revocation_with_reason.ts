import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_bans_create } from "../../../generate/generate_random_discussion_board_super_admin_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_ban_revocation_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create a user to ban (using available user creation utilities)
  // Since we don't have user creation utilities, we'll need to create a ban record
  // using the existing ban creation API which should handle user validation internally
  // 3. Create an active ban record
  const ban = await generate_random_discussion_board_super_admin_bans_create(
    superAdminConnection,
    {
      body: {
        banned_user_id: typia.random<string & tags.Format<"uuid">>(),
        ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
        ban_duration_type: "permanent",
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(ban);
  // 4. Verify ban was created with active status
  TestValidator.equals(
    "initial ban status should be active",
    ban.ban_status,
    "active",
  );
  // 5. Update ban record with revocation details
  const revocationReason = RandomGenerator.paragraph({ sentences: 1 });
  const updatedBan =
    await api.functional.discussionBoard.superAdmin.bans.update(
      superAdminConnection,
      {
        banId: ban.id,
        body: {
          ban_status: "revoked",
          revoked_reason: revocationReason,
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // 6. Validate revocation was successful
  TestValidator.equals(
    "ban status should be revoked",
    updatedBan.ban_status,
    "revoked",
  );
  TestValidator.predicate(
    "revoked_at should be set",
    updatedBan.revoked_at !== null,
  );
  TestValidator.equals(
    "revocation reason should match",
    updatedBan.revoked_reason,
    revocationReason,
  );
  if (updatedBan.revoked_at !== null && updatedBan.revoked_at !== undefined) {
    TestValidator.predicate(
      "revoked_at should be valid date",
      new Date(updatedBan.revoked_at).getTime() > 0,
    );
  }
  // 7. Validate audit trail integrity
  TestValidator.equals(
    "ban reason should remain unchanged",
    updatedBan.ban_reason,
    ban.ban_reason,
  );
  TestValidator.equals(
    "ban duration should remain unchanged",
    updatedBan.ban_duration_days,
    ban.ban_duration_days,
  );
  TestValidator.predicate(
    "updated_at should be after creation",
    new Date(updatedBan.updated_at).getTime() >
      new Date(ban.updated_at).getTime(),
  );
}