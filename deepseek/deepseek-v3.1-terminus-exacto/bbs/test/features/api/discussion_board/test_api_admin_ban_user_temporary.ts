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

export async function test_api_admin_ban_user_temporary(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Create a temporary ban using the utility function
  const ban = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
        ban_duration_type: "temporary",
        ban_duration_days: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies DeepPartial<IDiscussionBoardUserBan.ICreate>,
    },
  );
  typia.assert(ban);
  // Validate ban record
  TestValidator.equals("ban status should be active", ban.ban_status, "active");
  TestValidator.equals(
    "ban duration type should be temporary",
    ban.ban_duration_type,
    "temporary",
  );
  TestValidator.predicate(
    "ban duration days should be positive",
    ban.ban_duration_days! > 0,
  );
  TestValidator.predicate(
    "ban ends at should be set",
    ban.ban_ends_at !== null && ban.ban_ends_at !== undefined,
  );
  TestValidator.predicate(
    "ban started at should be set",
    ban.ban_started_at !== null && ban.ban_started_at !== undefined,
  );
  TestValidator.predicate(
    "banning administrator should be set",
    ban.banning_administrator !== null &&
      ban.banning_administrator !== undefined,
  );
  TestValidator.predicate(
    "banned user should be set",
    ban.banned_user !== null && ban.banned_user !== undefined,
  );
  TestValidator.equals(
    "appeal status should be none",
    ban.appeal_status,
    "none",
  );
  // Validate expiration timestamp calculation
  const banStartedAt = new Date(ban.ban_started_at);
  const banEndsAt = new Date(ban.ban_ends_at!);
  const expectedDurationMs = ban.ban_duration_days! * 24 * 60 * 60 * 1000;
  const actualDurationMs = banEndsAt.getTime() - banStartedAt.getTime();
  TestValidator.predicate(
    "ban duration should be correct",
    Math.abs(actualDurationMs - expectedDurationMs) < 1000,
  ); // Allow 1 second tolerance
}
