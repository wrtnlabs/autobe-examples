import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new seller for E2E testing.
 *
 * Creates a seller account with randomized credentials, mutates the connection
 * with the auth token for subsequent authenticated requests. The new seller
 * starts in "pending" approval status and must be approved by an administrator
 * before gaining access to product management, order processing, and the seller
 * dashboard.
 *
 * All join fields are populated with sensible random defaults — email, password,
 * session context (href, referrer, ip) — and can be individually overridden
 * through `props.body` for specific test scenarios. The password is generated as
 * a 16-character alphanumeric string.
 *
 * @param connection - The connection object that will be mutated with the Authorization header
 * @param props - Optional body with DeepPartial seller join fields for customization
 * @returns The authorized seller response containing tokens, seller identity, and profile
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
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.IJoin;
  return await api.functional.shoppingMall.auth.seller.join(connection, {
    body: joinInput,
  });
}
