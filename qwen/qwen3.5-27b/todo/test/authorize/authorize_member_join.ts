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
 * Register and authenticate a new member account for E2E testing.
 *
 * Creates a member account with email and password credentials, automatically
 * authenticating the member upon successful registration. The email address
 * must be unique and not already associated with an existing account.
 *
 * **Required Fields**:
 * - `email` - Unique email address for authentication (auto-generated if not provided)
 * - `password` - Plain text password, hashed by backend (auto-generated if not provided)
 * - `href` - Current page URI for session tracking (auto-generated if not provided)
 * - `referrer` - Referring page URI for session tracking (auto-generated if not provided)
 *
 * **Optional Fields**:
 * - `display_name` - User-friendly name for profile display (auto-generated if not provided)
 * - `ip` - Client IP address for SSR cases (auto-generated if not provided)
 *
 * Upon successful registration, the member is immediately authenticated with
 * JWT access and refresh tokens, which are automatically stored in the
 * connection headers for subsequent API calls.
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
