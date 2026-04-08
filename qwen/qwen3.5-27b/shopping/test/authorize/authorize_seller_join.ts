import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new seller for E2E testing.
 *
 * Creates a seller account with randomized credentials, mutates the connection with the auth token. The seller account is created with 'pending' approval status, requiring administrator review before the seller can list products and process orders.
 *
 * Session context fields (href, referrer, ip) are captured for security and audit purposes. The password is provided in plain text and will be hashed using BCrypt by the backend. Upon successful registration, JWT access and refresh tokens are returned for subsequent authenticated API requests.
 */
export async function authorize_seller_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSeller.IJoin>;
  },
): Promise<IShoppingMallSeller.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip,
  } satisfies IShoppingMallSeller.IJoin;
  return await api.functional.shoppingMall.auth.seller.join(connection, {
    body: joinInput,
  });
}
