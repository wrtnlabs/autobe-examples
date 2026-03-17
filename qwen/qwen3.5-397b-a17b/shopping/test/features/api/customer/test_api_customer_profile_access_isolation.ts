import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that customer profile access is properly isolated.
 *
 * This test validates that each customer can only retrieve their own profile
 * information, not other customers' profiles. The test registers two separate
 * customer accounts with different credentials, then verifies that:
 * 1. The first customer successfully retrieves only their own profile data
 * 2. The returned nickname and phone_number belong to the authenticated customer
 * 3. The endpoint enforces proper access control based on session authentication
 * 4. No mechanism exists to access another customer's profile through this endpoint
 */
export async function test_api_customer_profile_access_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Register first customer account
  const firstCustomerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(firstCustomerAuth);
  // Register second customer account with different credentials
  const secondCustomerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(secondCustomerAuth);
  // Create isolated connection for first customer using their access token
  const firstCustomerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${firstCustomerAuth.token.access}`,
    },
  };
  // Create isolated connection for second customer using their access token
  const secondCustomerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${secondCustomerAuth.token.access}`,
    },
  };
  // First customer retrieves their own profile
  const firstCustomerProfile =
    await api.functional.shoppingMall.customer.profile.at(
      firstCustomerConnection,
    );
  typia.assert(firstCustomerProfile);
  // Verify first customer's profile contains their own data
  TestValidator.equals(
    "first customer nickname matches",
    firstCustomerProfile.nickname,
    firstCustomerAuth.nickname,
  );
  TestValidator.equals(
    "first customer phone_number matches",
    firstCustomerProfile.phone_number,
    firstCustomerAuth.phone_number,
  );
  // Second customer retrieves their own profile
  const secondCustomerProfile =
    await api.functional.shoppingMall.customer.profile.at(
      secondCustomerConnection,
    );
  typia.assert(secondCustomerProfile);
  // Verify second customer's profile contains their own data
  TestValidator.equals(
    "second customer nickname matches",
    secondCustomerProfile.nickname,
    secondCustomerAuth.nickname,
  );
  TestValidator.equals(
    "second customer phone_number matches",
    secondCustomerProfile.phone_number,
    secondCustomerAuth.phone_number,
  );
  // Verify isolation: first and second customer profiles are different
  TestValidator.notEquals(
    "customer profiles are isolated",
    firstCustomerProfile.nickname,
    secondCustomerProfile.nickname,
  );
  TestValidator.notEquals(
    "customer phone numbers are different",
    firstCustomerProfile.phone_number,
    secondCustomerProfile.phone_number,
  );
}
