import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoListToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body: DeepPartial<ITodoListUser.IJoin>;
  },
): Promise<ITodoListUser.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? `${RandomGenerator.alphaNumeric(8)}@example.io`,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
  } satisfies ITodoListUser.IJoin;
  return await api.functional.auth.user.join(connection, { body: joinInput });
}
