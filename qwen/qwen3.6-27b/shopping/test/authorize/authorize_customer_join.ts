import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new customer for E2E testing.
 *
 * Creates a customer account with randomized credentials including email, password,
 * and session context (href, referrer, optional ip). Mutates the connection
 * with the authentication token upon successful registration.
 *
 * The email must be unique across all platform account types (customers, sellers,
 * and administrators). Password is submitted in plain text and hashed server-side.
 */
export async function authorize_customer_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformCustomer.IJoin>;
  },
): Promise<IEcommercePlatformCustomer.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommercePlatformCustomer.IJoin;
  return await api.functional.ecommercePlatform.auth.customer.join(connection, {
    body: joinInput,
  });
}
