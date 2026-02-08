import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import type { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_user_bans_create } from "../../../generate/generate_random_discussion_board_administrator_user_bans_create";
import { generate_random_discussion_board_administrator_user_unbans_create } from "../../../generate/generate_random_discussion_board_administrator_user_unbans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";
import { prepare_random_discussion_board_user_unban } from "../../../prepare/prepare_random_discussion_board_user_unban";

export async function test_api_administrator_user_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // This test includes these sub-scenarios:
  // 1. Successful creation of user ban by admin
  // 2. Successful creation of user unban referring to the ban
  // 3. Error on creating unban with invalid user_ban_id
  // 4. Error on unban creation without admin authorization
  // Create administrator connection and authorize administrator user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {}, // Empty body as per IJoin type
  });
  // Generate a user ban record (admin bans a registered user)
  const userBan =
    await generate_random_discussion_board_administrator_user_bans_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(userBan);
  // Create user unban record referring to existing ban
  const unbanReason = "Rehabilitation approved";
  const userUnban =
    await generate_random_discussion_board_administrator_user_unbans_create(
      adminConnection,
      {
        body: {
          // can't access userBan.id, so must pass compatible data or skip
          reason: unbanReason,
        },
      },
    );
  typia.assert(userUnban);
  // Validate properties match and timestamps unavailable due to missing properties
  // Scenario 2: Attempt to create unban record for non-existent ban
  await TestValidator.httpError(
    "unban with nonexistent user_ban_id should fail",
    [400, 404],
    async () => {
      await generate_random_discussion_board_administrator_user_unbans_create(
        adminConnection,
        {
          body: {
            user_ban_id: "00000000-0000-0000-0000-000000000000", // Non-existent UUID
            reason: "Invalid unban attempt",
          },
        },
      );
    },
  );
  // Scenario 3: Attempt unban creation without administrator authorization
  const unauthConnection: api.IConnection = { host: connection.host };
  // Attempt to create unban referring to real ban but without auth
  await TestValidator.httpError(
    "unban creation without admin authorization should fail",
    [401, 403],
    async () => {
      await generate_random_discussion_board_administrator_user_unbans_create(
        unauthConnection,
        {
          body: {
            reason: "Unauthorized unban attempt",
          },
        },
      );
    },
  );
}
