import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new customer for E2E testing.
 *
 * Creates a customer account with randomized credentials and session metadata,
 * then mutates the connection with the authorization token for subsequent
 * authenticated API requests. The email address is generated randomly and
 * guaranteed unique per invocation.
 *
 * @param connection - The API connection to mutate with the auth token
 * @param props - Properties containing optional partial body overrides
 * @returns The authorized customer data with identity, profile, and tokens
 */
export async function authorize_customer_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IECommerceMallCustomer.IJoin>;
  },
): Promise<IECommerceMallCustomer.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? null,
  } satisfies IECommerceMallCustomer.IJoin;
  return await api.functional.eCommerceMall.auth.customer.join(connection, {
    body: joinInput,
  });
}
