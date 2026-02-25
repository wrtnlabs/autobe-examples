import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_administrator_bans_create } from "../../../generate/generate_random_discussion_board_administrator_administrator_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_administrator_ban_update_reason_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  // Update adminConnection headers with authorization
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 2. Prepare a ban record to update
  const ban =
    await generate_random_discussion_board_administrator_administrator_bans_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(ban);
  // 3. Prepare update body with only reason changed
  const newReason = ban.reason + " - updated";
  const updateBody: IDiscussionBoardUserBan.IUpdate = {
    reason: newReason,
    bannedAt: ban.bannedAt, // unchanged
    administratorId: ban.administratorId ?? null, // unchanged
    createdAt: ban.createdAt,
    updatedAt: null, // Force update timestamp by server
    deletedAt: ban.deletedAt ?? null,
  };
  // 4. Perform update request
  const updatedBan =
    await api.functional.discussionBoard.administrator.administrator.bans.update(
      adminConnection,
      {
        banId: ban.id,
        body: updateBody,
      },
    );
  // 5. Validate response
  typia.assert(updatedBan);
  // Validate id unchanged
  TestValidator.equals("ban id unchanged", updatedBan.id, ban.id);
  // Validate reason updated
  TestValidator.equals("ban reason updated", updatedBan.reason, newReason);
  // Validate bannedAt unchanged
  TestValidator.equals("bannedAt unchanged", updatedBan.bannedAt, ban.bannedAt);
  // Validate administratorId unchanged (can be null)
  TestValidator.equals(
    "administratorId unchanged",
    updatedBan.administratorId ?? null,
    ban.administratorId ?? null,
  );
  // Validate createdAt unchanged
  TestValidator.equals(
    "createdAt unchanged",
    updatedBan.createdAt,
    ban.createdAt,
  );
  // Validate updatedAt updated (greater than previous)
  TestValidator.predicate(
    "updatedAt is later than original",
    new Date(updatedBan.updatedAt) > new Date(ban.updatedAt),
  );
  // Validate deletedAt unchanged
  TestValidator.equals(
    "deletedAt unchanged",
    updatedBan.deletedAt ?? null,
    ban.deletedAt ?? null,
  );
}
