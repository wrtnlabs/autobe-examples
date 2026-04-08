import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new super administrator for E2E testing.
 *
 * Creates a super admin account with randomized credentials, mutates the connection with the auth token. The generated password meets strength requirements (minimum 8 characters with uppercase, lowercase, number, and special character).
 *
 * **Token Handling:**
 * - The connection headers are automatically mutated with the access token
 * - Use the returned IAuthorized object for user details if needed
 *
 * @param connection - API connection that will be mutated with auth token
 * @param props.body - Optional overrides for join fields (email, password, href, referrer, ip)
 * @returns The authorized super admin response with JWT tokens
 */
export async function authorize_super_admin_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallSuperAdmin.IJoin>;
  },
): Promise<IEcommerceMallSuperAdmin.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password:
      props.body?.password ??
      `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!`,
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip,
  } satisfies IEcommerceMallSuperAdmin.IJoin;
  return await api.functional.ecommerceMall.auth.superAdmin.join(connection, {
    body: joinInput,
  });
}
