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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test retrieval of an existing customer account by unique identifier.
 *
 * Validates that a customer account can be successfully retrieved using its UUID, returning the complete entity including account metadata (id, email, is_banned, created_at, updated_at, deleted_at) and the optional nested customer profile. Verifies that newly registered customers have the correct default state with is_banned set to false and deleted_at set to null. Ensures that sensitive authentication data such as password_hash is excluded from the response by the type validation.
 *
 * The retrieval endpoint is public and does not require authentication, allowing access to customer details without an authorization token.
 *
 * 1. Customer registers a new account with email and password and receives authorization tokens.
 * 2. Customer account details are retrieved using the customerId from the join response.
 * 3. Validate that retrieved customer id matches the original account id.
 * 4. Validate that email in the retrieved customer matches the registration email.
 * 5. Validate that is_banned is false for a newly registered customer.
 * 6. Validate that deleted_at is null indicating an active account.
 * 7. If customer_profile exists, validate the nested customer summary references correctly.
 */
export async function test_api_customer_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: joinEmail,
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommercePlatformCustomer.IJoin;
  const authorized = await authorize_customer_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const customerId = authorized.id;
  // 2. Retrieve customer by id using a separate connection (endpoint is public)
  const retrieveConnection: api.IConnection = { host: connection.host };
  const retrieved = await api.functional.ecommercePlatform.customers.at(
    retrieveConnection,
    {
      customerId: customerId,
    },
  );
  typia.assert(retrieved);
  // 3. Validate that retrieved customer id matches
  TestValidator.equals("customer id matches", retrieved.id, customerId);
  // 4. Validate that email matches the registration email
  TestValidator.equals("email matches join input", retrieved.email, joinEmail);
  // 5. Validate is_banned is false for newly registered customer
  TestValidator.predicate("is_banned is false", retrieved.is_banned === false);
  // 6. Validate deleted_at is null (active account)
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
  // 7. If customer_profile exists, validate the nested structure
  if (
    retrieved.customer_profile !== null &&
    retrieved.customer_profile !== undefined
  ) {
    typia.assert(retrieved.customer_profile);
    TestValidator.predicate(
      "profile has display_name",
      retrieved.customer_profile.display_name.length > 0,
    );
    TestValidator.equals(
      "profile customer summary matches",
      retrieved.customer_profile.customer.id,
      retrieved.id,
    );
  }
}
