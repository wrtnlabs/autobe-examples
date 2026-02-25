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

export async function test_api_administrator_user_ban_creation_duplicate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator Authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IDiscussionBoardAdministrator.IJoin = {
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    password: RandomGenerator.alphaNumeric(16),
  };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  // Create new adminConnection with token
  const adminTokenConnection: api.IConnection = { host: connection.host };
  adminTokenConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // 2. Prepare a registered user and ban them (create initial ban)
  // Use the generate_random function to create a ban
  const firstBan =
    await generate_random_discussion_board_administrator_administrator_bans_create(
      adminTokenConnection,
      {
        body: {
          reason: "Initial ban for duplicate test",
        },
      },
    );
  typia.assert(firstBan);
  // 3. Attempt to create a duplicate ban for the same user (expect error)
  await TestValidator.error("duplicate ban error", async () => {
    await generate_random_discussion_board_administrator_administrator_bans_create(
      adminTokenConnection,
      {
        body: {
          registeredUserId: firstBan.registeredUserId, // same user as first ban
          reason: "Attempted duplicate ban",
        },
      },
    );
  });
}
