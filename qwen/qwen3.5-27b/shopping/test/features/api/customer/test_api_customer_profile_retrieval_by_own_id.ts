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
 * Test that an authenticated customer can retrieve their own profile information by customerId.
 *
 * 1. Register a new customer account
 * 2. Retrieve the customer's own profile using their ID
 * 3. Validate profile data matches registration information
 */
export async function test_api_customer_profile_retrieval_by_own_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Test: Retrieve customer's own profile by ID
  const profile = await api.functional.shoppingMall.customers.at(
    customerConnection,
    {
      customerId: authorized.id,
    },
  );
  typia.assert(profile);
  // 3. Validate: Profile data matches registration information
  TestValidator.equals(
    "email matches registration",
    profile.email,
    authorized.email,
  );
  TestValidator.equals(
    "display_name matches registration",
    profile.display_name,
    authorized.display_name,
  );
  TestValidator.equals(
    "phone_number matches registration",
    profile.phone_number,
    authorized.phone_number,
  );
  TestValidator.equals("id matches request", profile.id, authorized.id);
  TestValidator.equals("status is active", profile.status, "active");
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
  TestValidator.predicate("created_at is valid timestamp", () => {
    const date = new Date(profile.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid timestamp", () => {
    const date = new Date(profile.updated_at);
    return !isNaN(date.getTime());
  });
}
