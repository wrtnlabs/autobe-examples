import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
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

export async function test_api_administrator_unban_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Prepare anonymous connection (no auth headers)
  const anonymousConnection: api.IConnection = { host: connection.host };
  // Prepare an unbanId and update reason payload
  const unbanId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: IDiscussionBoardUserUnban.IUpdate = {
    reason: "Updated reason without authorization",
  };
  // Attempt to update unban record without admin authorization
  await TestValidator.httpError(
    "update unban unauthorized should fail",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.administrator.unbans.updateUnban(
        anonymousConnection,
        {
          unbanId,
          body: updateBody,
        },
      );
    },
  );
}
