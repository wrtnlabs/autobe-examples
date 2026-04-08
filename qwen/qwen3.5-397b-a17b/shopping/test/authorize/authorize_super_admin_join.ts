import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new super administrator for E2E testing.
 *
 * Creates a super administrator account with randomized credentials, mutates the connection with the auth token. The function generates random email, password, href, referrer, and optional IP address for session context tracking.
 *
 * The generated credentials use typia.random for format-based fields (email, href, referrer) and RandomGenerator for other fields (password). All fields can be overridden via props.body for specific test scenarios.
 *
 * @param connection - The API connection that will be mutated with the authorization token
 * @param props - Optional properties to override default random values
 * @returns The authorized super administrator account information with JWT tokens
 */
export async function authorize_super_admin_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSuperAdmin.IJoin>;
  },
): Promise<IShoppingMallSuperAdmin.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdmin.IJoin;
  return await api.functional.shoppingMall.auth.super_admin.join(connection, {
    body: joinInput,
  });
}
