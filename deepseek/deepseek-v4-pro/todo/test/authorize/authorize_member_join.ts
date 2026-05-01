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
 * Creates a member account with randomized credentials (email, password, display name),
 * captures session context metadata (href, referrer, ip), and establishes an authenticated
 * session. The connection's Authorization header is automatically populated with the
 * returned JWT access token by the underlying SDK function.
 *
 * All fields in the join payload can be overridden through props.body. Fields not provided
 * are populated with random data suitable for testing, ensuring each test run operates
 * with unique credentials without manual configuration.
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
