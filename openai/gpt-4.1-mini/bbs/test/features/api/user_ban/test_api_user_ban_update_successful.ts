import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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
import { generate_random_discussion_board_administrator_user_bans_create } from "../../../generate/generate_random_discussion_board_administrator_user_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_user_ban_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      // Using an empty join object since IDiscussionBoardAdministrator.IJoin is empty
    },
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Create initial user ban to update
  const initialBan =
    await generate_random_discussion_board_administrator_user_bans_create(
      adminConnection,
      {
        // no override body
      },
    );
  typia.assert(initialBan);
  // 3. Prepare update data with new reason and administratorId
  const updatedReason = RandomGenerator.paragraph({ sentences: 3 });
  const updatedAdministratorId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: IDiscussionBoardUserBan.IUpdate = {
    reason: updatedReason,
    administratorId: updatedAdministratorId,
  };
  // 4. Update the ban record
  const updatedBan =
    await api.functional.discussionBoard.administrator.userBans.update(
      adminConnection,
      {
        banId: (initialBan as any).id,
        body: updateBody,
      },
    );
  typia.assert(updatedBan);
  // 5. Validations
  TestValidator.equals(
    "update reason matches",
    (updatedBan as any).reason,
    (updateBody as any).reason,
  );
  TestValidator.equals(
    "update administratorId matches",
    (updatedBan as any).administratorId,
    (updateBody as any).administratorId,
  );
  TestValidator.equals(
    "unchanged bannedAt matches",
    (updatedBan as any).bannedAt,
    (initialBan as any).bannedAt,
  );
  TestValidator.equals(
    "unchanged createdAt matches",
    (updatedBan as any).createdAt,
    (initialBan as any).createdAt,
  );
  TestValidator.equals(
    "unchanged updatedAt matches",
    (updatedBan as any).updatedAt,
    (initialBan as any).updatedAt,
  );
  TestValidator.equals(
    "unchanged deletedAt matches",
    (updatedBan as any).deletedAt,
    (initialBan as any).deletedAt,
  );
  // 6. Confirm unauthorized access is denied
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Using no authorization header at all
  await TestValidator.error(
    "unauthorized access denied",
    async () =>
      await api.functional.discussionBoard.administrator.userBans.update(
        unauthorizedConnection,
        {
          banId: (initialBan as any).id,
          body: updateBody,
        },
      ),
  );
}
