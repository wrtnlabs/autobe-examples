import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new administrator for E2E testing.
 *
 * Creates an administrator account with randomized credentials, mutates the connection with the auth token. The email serves as the unique login credential and must not already exist in the system. The password is securely hashed using bcrypt before storage.
 *
 * Session context fields (href, referrer, ip) are captured for security auditing and session tracking purposes. The href represents the current page URL where registration occurred, referrer indicates the previous page, and ip records the client's IP address (optional for server-side rendering scenarios).
 */
export async function authorize_administrator_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallAdministrator.IJoin>;
  },
): Promise<IShoppingMallAdministrator.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdministrator.IJoin;
  return await api.functional.shoppingMall.auth.administrator.join(connection, {
    body: joinInput,
  });
}
