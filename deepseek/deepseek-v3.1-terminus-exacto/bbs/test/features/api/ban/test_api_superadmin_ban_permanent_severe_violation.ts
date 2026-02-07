import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_super_admin_bans_create } from "../../../generate/generate_random_discussion_board_super_admin_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_superadmin_ban_permanent_severe_violation(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Create regular user account to be banned
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(user);
  // Create permanent ban for severe violation
  const ban = await api.functional.discussionBoard.superAdmin.bans.create(
    superAdminConnection,
    {
      body: {
        banned_user_id: user.id,
        ban_reason:
          "Permanent ban issued for severe platform violations including harassment, hate speech, and repeated policy violations that warrant indefinite exclusion.",
        ban_duration_type: "permanent",
        ban_duration_days: undefined,
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(ban);
  // Validate permanent ban properties
  TestValidator.equals("ban duration type", ban.ban_duration_type, "permanent");
  TestValidator.equals(
    "ban ends at should be null for permanent",
    ban.ban_ends_at,
    null,
  );
  TestValidator.equals("ban status should be active", ban.ban_status, "active");
  TestValidator.predicate(
    "ban reason should not be empty",
    ban.ban_reason.length > 0,
  );
  // Validate relationship data
  TestValidator.equals("banned user ID matches", ban.banned_user.id, user.id);
  TestValidator.equals(
    "banned user display name matches",
    ban.banned_user.display_name,
    user.display_name,
  );
  // Validate banning administrator information
  TestValidator.predicate(
    "banning administrator should have ID",
    ban.banning_administrator.id.length > 0,
  );
  TestValidator.predicate(
    "banning administrator should have email",
    ban.banning_administrator.email.length > 0,
  );
  // Validate audit fields
  TestValidator.predicate(
    "ban started at should be valid date",
    new Date(ban.ban_started_at).getTime() > 0,
  );
  TestValidator.predicate(
    "created at should be valid date",
    new Date(ban.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated at should be valid date",
    new Date(ban.updated_at).getTime() > 0,
  );
  // Validate appeal status is 'none' for new ban
  TestValidator.equals(
    "appeal status should be none",
    ban.appeal_status,
    "none",
  );
  TestValidator.equals("appeal reason should be null", ban.appeal_reason, null);
  TestValidator.equals(
    "appeal reviewed at should be null",
    ban.appeal_reviewed_at,
    null,
  );
  // Validate revocation fields are null for new ban
  TestValidator.equals("revoked at should be null", ban.revoked_at, null);
  TestValidator.equals(
    "revocation reason should be null",
    ban.revocation_reason,
    null,
  );
}
