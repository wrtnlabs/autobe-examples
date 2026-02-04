import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
export async function authorize_user_refresh(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoUser.IRefresh>;
  },
): Promise<ITodoUser.IAuthorized> {
  const refreshInput = {
    refresh_token:
      props.body?.refresh_token ?? RandomGenerator.alphaNumeric(128),
  } satisfies ITodoUser.IRefresh;
  return await api.functional.todo.auth.user.refresh(connection, {
    body: refreshInput,
  });
}
