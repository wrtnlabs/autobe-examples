import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodoEditHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAppTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_edit_history_non_existent_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account using utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const member: IMultiUserTodoAppMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(member);
  // 2. Create member-specific connection with authorization token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: member.token.access,
  };
  // 3. Generate a valid UUID for a non-existent todo
  // This UUID format is valid but will not correspond to any actual todo in the system
  const nonExistentTodoId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to get edit history for non-existent todo
  // This should throw an HttpError with 404 status code
  // TestValidator.error will catch the thrown HttpError and verify it's an error
  await TestValidator.error(
    "edit history for non-existent todo returns 404",
    async () => {
      await api.functional.multiUserTodoApp.member.todos.history.at(
        memberConnection,
        {
          todoId: nonExistentTodoId,
        },
      );
    },
  );
}
