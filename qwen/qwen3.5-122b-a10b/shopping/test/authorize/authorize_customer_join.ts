import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new customer for E2E testing.
 *
 * Creates a customer account with randomized credentials, mutates the connection with the auth token, and returns the authenticated customer data.
 *
 * **Registration Flow**
 *
 * Generates random email, password, display name, and URI fields, then calls the customer join endpoint to create the account and receive JWT tokens.
 *
 * **Random Data Generation**
 *
 * - Email: Randomly generated valid email format
 * - Password: 16-character alphanumeric string (meets minimum 8 character requirement)
 * - Display Name: Randomly generated name
 * - Phone Number: Random Korean mobile number (optional)
 * - URIs: Random valid URI format for href and referrer
 *
 * @param connection HTTP connection configuration
 * @param props Optional body overrides for custom test data
 * @returns Authenticated customer data with JWT tokens
 */
export async function authorize_customer_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceCustomer.IJoin>;
  },
): Promise<IEcommerceCustomer.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    display_name: props.body?.display_name ?? RandomGenerator.name(),
    phone_number: props.body?.phone_number ?? RandomGenerator.mobile(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceCustomer.IJoin;
  return await api.functional.ecommerce.auth.customer.join(connection, {
    body: joinInput,
  });
}
