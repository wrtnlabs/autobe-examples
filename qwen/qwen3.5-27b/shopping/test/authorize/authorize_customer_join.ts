import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new customer for E2E testing.
 *
 * Creates a customer account with randomized credentials, mutates the connection with the auth token. The email address serves as the unique identifier for login and authentication. The password is securely hashed by the backend using bcrypt.
 *
 * Session context fields (href, referrer, ip) are captured for security monitoring and session management. Upon successful registration, the customer receives JWT access and refresh tokens for authenticated API access.
 */
export async function authorize_customer_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCustomer.IJoin>;
  },
): Promise<IShoppingMallCustomer.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  return await api.functional.shoppingMall.auth.customer.join(connection, {
    body: joinInput,
  });
}
