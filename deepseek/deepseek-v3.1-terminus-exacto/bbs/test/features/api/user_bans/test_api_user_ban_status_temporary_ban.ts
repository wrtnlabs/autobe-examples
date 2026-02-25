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
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_user_ban_status_temporary_ban(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: "admin123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  await authorize_user_login(userConnection, {
    body: {
      email: userJoin.email,
      password: "user123",
    } satisfies IDiscussionBoardUser.ILogin,
  });
  // Create temporary ban for the user
  const banRecord = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        bannedUserId: userJoin.id,
        banReason: RandomGenerator.paragraph({ sentences: 3 }),
        banDurationType: "temporary",
        banDurationDays: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
        >(),
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // Check ban status for the user
  const banStatus =
    await api.functional.discussionBoard.user.bans.my_ban.at(userConnection);
  typia.assert(banStatus);
  // Validate ban details
  TestValidator.equals("ban record ID matches", banStatus.id, banRecord.id);
  TestValidator.equals(
    "ban reason matches",
    banStatus.banReason,
    banRecord.banReason,
  );
  TestValidator.equals(
    "ban duration type is temporary",
    banStatus.banDurationType,
    "temporary",
  );
  TestValidator.predicate(
    "ban duration days is set",
    banStatus.banDurationDays !== null && banStatus.banDurationDays > 0,
  );
  TestValidator.predicate(
    "ban start time is set",
    banStatus.banStartedAt !== null,
  );
  TestValidator.predicate("ban end time is set", banStatus.banEndsAt !== null);
  TestValidator.equals("ban status is active", banStatus.banStatus, "active");
  TestValidator.equals(
    "banned user ID matches",
    banStatus.bannedUser.id,
    userJoin.id,
  );
  TestValidator.predicate(
    "banning administrator is set",
    banStatus.banningAdministrator.id !== undefined,
  );
}
