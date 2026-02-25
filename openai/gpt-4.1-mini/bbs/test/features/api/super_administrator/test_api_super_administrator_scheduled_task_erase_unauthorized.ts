import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_scheduled_task_erase_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Unauthorized deletion attempt test
  // 1) Authenticate as a registeredUser
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const registeredUser = await authorize_registered_user_join(
    registeredUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Test1234!",
      },
    },
  );
  // Apply authorization token to connection
  registeredUserConnection.headers = {
    Authorization: registeredUser.token.access,
  };
  // Generate a valid UUID for scheduled task id
  const scheduledTaskId = typia.random<string & tags.Format<"uuid">>();
  // 2) Attempt to DELETE with registeredUser connection
  await TestValidator.httpError(
    "delete scheduled task unauthorized",
    403,
    async () => {
      await api.functional.discussionBoard.superAdministrator.scheduledTasks.erase(
        registeredUserConnection,
        { id: scheduledTaskId },
      );
    },
  );
}
