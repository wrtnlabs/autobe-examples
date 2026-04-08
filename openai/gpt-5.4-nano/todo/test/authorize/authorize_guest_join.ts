import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a guest for E2E testing.
 *
 * Creates a guest account with randomized credentials (or uses provided
 * overrides), then calls the guest join endpoint to issue JWT authorization
 * tokens and set the connection Authorization header.
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body: IMultiUserTodoUserProfile.IJoin;
  },
): Promise<IMultiUserTodoUserProfile.IAuthorized> {
  const joinInput = {
    display_name: props.body.display_name,
    password: props.body.password,
    href: props.body.href,
    referrer: props.body.referrer,
    ip: props.body.ip,
  } satisfies IMultiUserTodoUserProfile.IJoin;
  return await api.functional.multiUserTodo.auth.guest.join(connection, {
    body: joinInput,
  });
}
