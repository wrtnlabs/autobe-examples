import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_user_ban_update_lift_ban(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create an active ban record
  const ban = await generate_random_discussion_board_admin_user_bans_create(
    adminConnection,
    {
      body: {
        member_id: typia.random<string & tags.Format<"uuid">>(),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(ban);
  // Validate initial ban status is 'active'
  TestValidator.equals(
    "initial ban status should be 'active'",
    ban.status,
    "active",
  );
  // Store original timestamps for comparison
  const originalBannedAt = ban.banned_at;
  const originalCreatedAt = ban.created_at;
  const originalUpdatedAt = ban.updated_at;
  // Update ban status to 'removed' to lift the ban
  const updatedBan =
    await api.functional.discussionBoard.admin.user_bans.update(
      adminConnection,
      {
        banId: ban.id,
        body: {
          status: "removed",
        } satisfies IDiscussionBoardUserBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // Validate the ban was successfully lifted
  TestValidator.equals(
    "ban status should be 'removed'",
    updatedBan.status,
    "removed",
  );
  TestValidator.predicate(
    "unbanned_at should be set",
    updatedBan.unbanned_at !== null,
  );
  TestValidator.notEquals(
    "updated_at timestamp should be refreshed",
    updatedBan.updated_at,
    originalUpdatedAt,
  );
  // Verify original metadata is preserved
  TestValidator.equals(
    "ban reason should be preserved",
    updatedBan.reason,
    ban.reason,
  );
  TestValidator.equals(
    "banned_at timestamp should be preserved",
    updatedBan.banned_at,
    originalBannedAt,
  );
  TestValidator.equals(
    "created_at timestamp should be preserved",
    updatedBan.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "expires_at should be preserved",
    updatedBan.expires_at,
    ban.expires_at,
  );
}
