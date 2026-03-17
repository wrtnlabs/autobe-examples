import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoAppMember.IJoin,
  });
  typia.assert(member1);
  // 2. Register second member
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoAppMember.IJoin,
  });
  typia.assert(member2);
  // 3. Test deletion with valid UUID format but non-existent ID
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent todo returns 404",
    404,
    async () => {
      await api.functional.multiUserTodoApp.member.todos.erase(
        member1Connection,
        {
          todoId: nonExistentTodoId,
        },
      );
    },
  );
  // 4. Test deletion of another user's todo - should also return 404
  const anotherUserTodoId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "another user's todo returns 404",
    404,
    async () => {
      await api.functional.multiUserTodoApp.member.todos.erase(
        member1Connection,
        {
          todoId: anotherUserTodoId,
        },
      );
    },
  );
}
