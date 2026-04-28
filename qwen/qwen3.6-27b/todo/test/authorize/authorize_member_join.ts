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
 * Creates a member account with randomized credentials including email, password, and session context (href, referrer). The display name is optional and can be omitted during registration. The connection is automatically mutated with the access token from the authorization response.
 */
export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppMember.IJoin>;
  },
): Promise<ITodoAppMember.IAuthorized> {
  const joinInput: ITodoAppMember.IJoin = {
    display_name: props.body?.display_name ?? RandomGenerator.name(1),
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
  };
  return await api.functional.todoApp.auth.member.join(connection, {
    body: joinInput,
  });
}
