import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
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
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_ban_update_clear_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator registration & login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdmin);
  // 2. Create initial ban record by super administrator
  const ban =
    await generate_random_discussion_board_super_administrator_administrator_bans_create(
      superAdminConnection,
      {},
    );
  typia.assert(ban);
  // 3. Prepare update payload clear administratorId, set new reason and bannedAt
  const newReason = `Updated reason ${typia.random<string & tags.Format<"uuid">>()}`;
  const newBannedAt = new Date().toISOString();
  const updateBody: IDiscussionBoardUserBan.IUpdate = {
    reason: newReason,
    bannedAt: newBannedAt,
    administratorId: null,
    createdAt: ban.createdAt,
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
  // 4. Execute update ban record
  const updatedBan =
    await api.functional.discussionBoard.superAdministrator.administrator.bans.update(
      superAdminConnection,
      {
        banId: ban.id,
        body: updateBody,
      },
    );
  typia.assert(updatedBan);
  // 5. Validate fields updated properly
  TestValidator.equals("updated reason matches", updatedBan.reason, newReason);
  TestValidator.equals(
    "updated bannedAt matches",
    updatedBan.bannedAt,
    newBannedAt,
  );
  TestValidator.equals(
    "administratorId is cleared (null)",
    updatedBan.administratorId,
    null,
  );
  // Administrator summary is nullable and should be either undefined or null after clearing
  TestValidator.predicate(
    "administrator is cleared (null or undefined)",
    updatedBan.administrator === null || updatedBan.administrator === undefined,
  );
  // createdAt unchanged
  TestValidator.equals(
    "createdAt unchanged",
    updatedBan.createdAt,
    ban.createdAt,
  );
  // updatedAt recent
  TestValidator.predicate(
    "updatedAt is recent",
    new Date(updatedBan.updatedAt).getTime() >=
      new Date(ban.updatedAt).getTime(),
  );
  // deletedAt remains null
  TestValidator.equals("deletedAt is null", updatedBan.deletedAt, null);
}
