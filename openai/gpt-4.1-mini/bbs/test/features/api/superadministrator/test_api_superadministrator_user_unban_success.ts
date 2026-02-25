import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import type { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_super_administrator_administrator_bans_create } from "../../../generate/generate_random_discussion_board_super_administrator_administrator_bans_create";
import { generate_random_discussion_board_super_administrator_administrator_unbans_create_unban } from "../../../generate/generate_random_discussion_board_super_administrator_administrator_unbans_create_unban";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";
import { prepare_random_discussion_board_user_unban } from "../../../prepare/prepare_random_discussion_board_user_unban";

export async function test_api_superadministrator_user_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuth);
  superAdminConnection.headers = { Authorization: superAdminAuth.token.access };
  // 2. Create a banned user by banning a registered user
  const ban =
    await generate_random_discussion_board_super_administrator_administrator_bans_create(
      superAdminConnection,
      { body: {} },
    );
  typia.assert(ban);
  // 3. Send unban request referencing the ban
  const unbanReason = `Unbanning user because of test: ${ban.registeredUser.email}`;
  const unbanInput: IDiscussionBoardUserUnban.ICreate = {
    userBanId: ban.id,
    administratorId: superAdminAuth.id,
    reason: unbanReason,
  };
  const unban =
    await generate_random_discussion_board_super_administrator_administrator_unbans_create_unban(
      superAdminConnection,
      { body: unbanInput },
    );
  typia.assert(unban);
  // 4. Validate unban response correctness
  TestValidator.equals("unban userBanId matches", unban.userBan.id, ban.id);
  TestValidator.equals(
    "unban administratorId matches",
    unban.administrator.id,
    superAdminAuth.id,
  );
  TestValidator.equals("unban reason matches", unban.reason, unbanReason);
}
