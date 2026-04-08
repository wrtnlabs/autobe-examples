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
 * Creates a member account with randomized credentials, mutates the connection with the auth token, and returns the complete authentication response including JWT tokens.
 *
 * **Random Data Generation**
 *
 * The function generates random test data for all required fields: email address, password, display name, and session context (href, referrer, optional IP). Custom values can be provided through props.body to override defaults.
 *
 * **Authentication Flow**
 *
 * After successful registration, the member's access token is automatically set in the connection headers for subsequent authenticated requests. The returned ITodoAppMember.IAuthorized object contains member profile information and dual-token JWT structure for session management.
 */
export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppMember.IJoin>;
  },
): Promise<ITodoAppMember.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    display_name: props.body?.display_name ?? RandomGenerator.name(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  return await api.functional.todoApp.auth.member.join(connection, {
    body: joinInput,
  });
}
