import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body?: Partial<ITodoAppUser.IJoin>;
  },
): Promise<ITodoAppUser.IAuthorized> {
  const joinInput = {
    username: props.body?.username ?? RandomGenerator.alphaNumeric(8),
    email:
      props.body?.email ?? `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? `https://example.com/register`,
    referrer: props.body?.referrer ?? `https://example.com/home`,
  } satisfies ITodoAppUser.IJoin;
  return await api.functional.todoApp.auth.user.join(connection, {
    body: joinInput,
  });
}
