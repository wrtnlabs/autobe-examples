import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_admin_user_ban_temporary(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(10),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create user connection and register a target user
  const userConnection: api.IConnection = { host: connection.host };
  const userPassword = RandomGenerator.alphabets(10);
  const targetUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: userPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(targetUser);
  // Create temporary ban
  const banDurationDays = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
  >();
  const ban = await api.functional.discussionBoard.admin.user_bans.create(
    adminConnection,
    {
      body: {
        bannedUserId: targetUser.id,
        banReason: RandomGenerator.paragraph({ sentences: 2 }),
        banDurationType: "temporary" as const,
        banDurationDays: banDurationDays,
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(ban);
  // Validate ban record structure
  TestValidator.equals("ban status should be active", ban.banStatus, "active");
  TestValidator.equals(
    "appeal status should be none",
    ban.appealStatus,
    "none",
  );
  TestValidator.notEquals(
    "ban started at should be set",
    ban.banStartedAt,
    null,
  );
  TestValidator.notEquals(
    "ban ends at should be set for temporary ban",
    ban.banEndsAt,
    null,
  );
  // Validate ban duration calculation
  const banStartedAt = new Date(ban.banStartedAt);
  const banEndsAt = new Date(ban.banEndsAt!);
  const expectedEndDate = new Date(banStartedAt);
  expectedEndDate.setDate(banStartedAt.getDate() + banDurationDays);
  TestValidator.equals(
    "ban end date should match duration calculation",
    banEndsAt.toISOString().substring(0, 10),
    expectedEndDate.toISOString().substring(0, 10),
  );
  // Validate relationships
  TestValidator.equals(
    "banned user ID should match",
    ban.bannedUser.id,
    targetUser.id,
  );
  TestValidator.equals(
    "banned user email should match",
    ban.bannedUser.email,
    targetUser.email,
  );
  TestValidator.equals(
    "banning administrator ID should match",
    ban.banningAdministrator.id,
    admin.id,
  );
  TestValidator.equals(
    "banning admin email should match",
    ban.banningAdministrator.email,
    admin.email,
  );
  // Verify user cannot login after ban using the correct password
  await TestValidator.error(
    "banned user should not be able to login",
    async () => {
      await authorize_user_login(userConnection, {
        body: {
          email: targetUser.email,
          password: userPassword,
        } satisfies IDiscussionBoardUser.ILogin,
      });
    },
  );
}
