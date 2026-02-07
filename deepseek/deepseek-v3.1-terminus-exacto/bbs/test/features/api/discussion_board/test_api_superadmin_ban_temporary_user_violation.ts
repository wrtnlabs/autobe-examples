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

export async function test_api_superadmin_ban_temporary_user_violation(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create regular user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create temporary ban
  const banDurationDays = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
  >();
  const ban = await api.functional.discussionBoard.superAdmin.bans.create(
    superAdminConnection,
    {
      body: {
        banned_user_id: user.id,
        ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
        ban_duration_type: "temporary",
        ban_duration_days: banDurationDays,
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(ban);
  // Validate ban status and relationships
  TestValidator.equals(
    "ban status should be 'active'",
    ban.ban_status,
    "active",
  );
  TestValidator.equals(
    "ban duration type should be 'temporary'",
    ban.ban_duration_type,
    "temporary",
  );
  TestValidator.equals(
    "ban duration days should match input",
    ban.ban_duration_days,
    banDurationDays,
  );
  TestValidator.equals(
    "banned user ID should match",
    ban.banned_user.id,
    user.id,
  );
  TestValidator.equals(
    "banning administrator ID should match",
    ban.banning_administrator.id,
    superAdmin.id,
  );
  // Validate ban duration calculation using string comparison
  const banStartedAt = new Date(ban.ban_started_at);
  const banEndsAt = new Date(ban.ban_ends_at!);
  const expectedEndDate = new Date(banStartedAt);
  expectedEndDate.setDate(banStartedAt.getDate() + banDurationDays);
  TestValidator.predicate(
    "ban ends at should be calculated correctly",
    Math.abs(banEndsAt.getTime() - expectedEndDate.getTime()) < 5000,
  ); // Allow 5 second tolerance for system clock differences
  // Validate audit trail and nullable fields
  TestValidator.predicate("created_at should be set", ban.created_at !== null);
  TestValidator.predicate("updated_at should be set", ban.updated_at !== null);
  TestValidator.equals(
    "appeal_status should be 'none'",
    ban.appeal_status,
    "none",
  );
  TestValidator.predicate(
    "appeal_reviewer should be null or undefined",
    ban.appeal_reviewer === null || ban.appeal_reviewer === undefined,
  );
  TestValidator.predicate(
    "revoked_by should be null or undefined",
    ban.revoked_by === null || ban.revoked_by === undefined,
  );
  TestValidator.predicate(
    "appeal_reason should be null or undefined",
    ban.appeal_reason === null || ban.appeal_reason === undefined,
  );
  TestValidator.predicate(
    "appeal_reviewed_at should be null or undefined",
    ban.appeal_reviewed_at === null || ban.appeal_reviewed_at === undefined,
  );
  TestValidator.predicate(
    "appeal_decision_reason should be null or undefined",
    ban.appeal_decision_reason === null ||
      ban.appeal_decision_reason === undefined,
  );
  TestValidator.predicate(
    "revoked_at should be null or undefined",
    ban.revoked_at === null || ban.revoked_at === undefined,
  );
  TestValidator.predicate(
    "revocation_reason should be null or undefined",
    ban.revocation_reason === null || ban.revocation_reason === undefined,
  );
  // Validate ban reason content
  TestValidator.predicate(
    "ban reason should not be empty",
    ban.ban_reason.length > 0,
  );
}
