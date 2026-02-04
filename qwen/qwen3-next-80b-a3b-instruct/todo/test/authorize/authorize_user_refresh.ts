import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_user_refresh(
  connection: api.IConnection,
  props: {
    body: ITodoAppUser.IRefresh;
  },
): Promise<ITodoAppUser.IAuthorized> {
  // The refresh token is passed in the body as specified in the DTO
  // No need to construct additional data since IRefresh is an empty object
  // Directly pass the props to the SDK function
  return await api.functional.todoApp.auth.user.refresh(connection, {
    body: props.body,
  });
}
