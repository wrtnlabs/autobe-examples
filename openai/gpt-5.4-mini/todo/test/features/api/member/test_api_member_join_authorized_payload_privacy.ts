import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_authorized_payload_privacy(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoAppMember.IJoin;
  const output = await authorize_member_join(memberConnection, { body });
  typia.assert(output);
  TestValidator.equals(
    "member email matches join payload",
    output.email,
    body.email,
  );
  TestValidator.equals(
    "profile member id matches authorized member id",
    (output.profile.member as unknown as { id: string }).id,
    output.id,
  );
  TestValidator.equals(
    "profile member email matches authorized member email",
    (output.profile.member as unknown as { email: string }).email,
    output.email,
  );
  TestValidator.predicate(
    "todos are returned as an array",
    Array.isArray(output.todos),
  );
  TestValidator.equals(
    "deleted_at is null for active member",
    output.deleted_at,
    null,
  );
  TestValidator.predicate(
    "authorized payload does not expose password material",
    !("password" in output) &&
      !("password_hash" in output) &&
      !("password" in output.profile) &&
      !("password_hash" in output.profile),
  );
  TestValidator.predicate(
    "returned todos belong to the authorized member",
    output.todos.every(
      (todo) => (todo.member as unknown as { id: string }).id === output.id,
    ),
  );
}
