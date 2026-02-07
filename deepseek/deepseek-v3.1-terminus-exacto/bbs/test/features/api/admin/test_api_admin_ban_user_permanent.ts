import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

/**
 * Test the creation of a permanent ban for severe violations that warrant indefinite exclusion from the platform.
 * The administrator authenticates and creates a permanent ban record with a comprehensive ban reason.
 * The system should validate the user exists, set ban duration type to 'permanent' with null duration days,
 * establish an indefinite ban status, and ensure all audit fields are properly populated.
 * Verify that permanent bans have no expiration date and that the banned user is completely prevented
 * from accessing the platform while their historical content remains visible for discussion continuity.
 */
export async function test_api_admin_ban_user_permanent(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Generate a random user ID to represent the banned user
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // Create permanent ban
  const ban = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        banned_user_id: bannedUserId,
        ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
        ban_duration_type: "permanent",
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(ban);
  // Validate ban details
  TestValidator.equals("ban duration type", ban.ban_duration_type, "permanent");
  TestValidator.equals("ban duration days", ban.ban_duration_days, null);
  TestValidator.equals("ban ends at", ban.ban_ends_at, null);
  TestValidator.equals("ban status", ban.ban_status, "active");
  TestValidator.predicate("ban reason not empty", ban.ban_reason.length > 0);
  TestValidator.predicate(
    "ban started at valid",
    new Date(ban.ban_started_at) <= new Date(),
  );
  TestValidator.predicate(
    "created at valid",
    new Date(ban.created_at) <= new Date(),
  );
  TestValidator.predicate(
    "updated at valid",
    new Date(ban.updated_at) <= new Date(),
  );
  // Validate banned user details
  TestValidator.equals("banned user id", ban.banned_user.id, bannedUserId);
  TestValidator.predicate(
    "banned user display name not empty",
    ban.banned_user.display_name.length > 0,
  );
  // Validate banning administrator details
  TestValidator.predicate(
    "banning administrator id valid",
    ban.banning_administrator.id.length > 0,
  );
  TestValidator.predicate(
    "banning administrator email valid",
    ban.banning_administrator.email.includes("@"),
  );
  TestValidator.predicate(
    "banning administrator display name not empty",
    ban.banning_administrator.display_name.length > 0,
  );
}