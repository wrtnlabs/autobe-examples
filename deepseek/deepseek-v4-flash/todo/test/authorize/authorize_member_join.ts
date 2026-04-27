import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new member for E2E testing.
 *
 * Creates a member account with randomized credentials, generates required
 * session context values, then calls the join API. On success, the connection
 * object is automatically mutated with the JWT access token for subsequent
 * authenticated requests.
 *
 * @param connection The API connection to mutate with the auth token
 * @param props Input data with optional overrides for the join payload
 * @returns The authorized member data including account info and tokens
 */
export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body: ITodoAppMember.IJoin;
  },
): Promise<ITodoAppMember.IAuthorized> {
  return await api.functional.todoApp.auth.member.join(connection, {
    body: props.body,
  });
}
