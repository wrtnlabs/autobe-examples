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
 * Creates a member account with randomized credentials, mutates the connection with the auth token, and returns the authorized member data including JWT tokens. The generated credentials include a unique email address, secure password, and display name.
 *
 * Session context fields (href, referrer, ip) are automatically generated to simulate realistic registration scenarios. The ip field is optional to support various testing environments. All generated data conforms to the ITodoAppMember.IJoin type specification with proper format validation.
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
    displayName: props.body?.displayName ?? RandomGenerator.name(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  return await api.functional.todoApp.auth.member.join(connection, {
    body: joinInput,
  });
}
