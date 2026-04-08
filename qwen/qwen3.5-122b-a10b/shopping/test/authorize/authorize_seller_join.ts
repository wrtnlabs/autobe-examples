import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new seller account for E2E testing.
 *
 * Creates a seller account with randomized credentials, mutates the connection with the auth token, and returns the authorized seller information including JWT tokens for subsequent API calls.
 *
 * **Registration Process**
 *
 * The function generates random email, password, and URI fields, then calls the seller join endpoint. The system validates email uniqueness, enforces password strength (minimum 8 characters), and creates the seller account with pending approval status. An email verification token is generated and sent to the provided email address.
 *
 * **Authentication Flow**
 *
 * After successful registration, the connection object is automatically mutated with the access token in the Authorization header. The returned IAuthorized object contains the seller's unique identifier, account status information, and JWT token pair (access and refresh tokens) with expiration timestamps.
 *
 * **Usage**
 *
 * This utility is designed for E2E test scenarios where seller accounts need to be created and authenticated. The generated credentials are random but valid, ensuring test isolation across multiple test runs.
 */
export async function authorize_seller_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceSeller.IJoin>;
  },
): Promise<IEcommerceSeller.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceSeller.IJoin;
  return await api.functional.ecommerce.auth.seller.join(connection, {
    body: joinInput,
  });
}
