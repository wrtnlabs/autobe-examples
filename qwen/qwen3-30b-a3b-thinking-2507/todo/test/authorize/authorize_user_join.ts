import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
export async function authorize_user_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoUser.IJoin>;
  },
): Promise<ITodoUser.IAuthorized> {
  const joinInput = {
    email:
      props.body?.email ?? `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
  } satisfies ITodoUser.IJoin;
  return await api.functional.todo.auth.user.join(connection, {
    body: joinInput,
  });
}
