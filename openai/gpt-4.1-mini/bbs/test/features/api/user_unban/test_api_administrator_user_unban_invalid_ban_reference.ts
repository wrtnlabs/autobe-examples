import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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
import { generate_random_discussion_board_administrator_user_unbans_create } from "../../../generate/generate_random_discussion_board_administrator_user_unbans_create";
import { prepare_random_discussion_board_user_unban } from "../../../prepare/prepare_random_discussion_board_user_unban";

export async function test_api_administrator_user_unban_invalid_ban_reference(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(auth);
  adminConnection.headers = { Authorization: `Bearer ${auth.token.access}` };
  // 2. Attempt to create an unban record with a non-existent user_ban_id
  const nonExistentUserBanId = "00000000-0000-0000-0000-000000000000";
  const body: IDiscussionBoardUserUnban.ICreate = {
    user_ban_id: nonExistentUserBanId,
    administrator_id: "00000000-0000-0000-0000-000000000000",
    reason: "Attempt to unban with invalid ban reference",
  };
  // 3. Expect an error indicating invalid ban reference
  await TestValidator.error(
    "creating user unban with invalid ban reference",
    async () => {
      await generate_random_discussion_board_administrator_user_unbans_create(
        adminConnection,
        {
          body,
        },
      );
    },
  );
}
