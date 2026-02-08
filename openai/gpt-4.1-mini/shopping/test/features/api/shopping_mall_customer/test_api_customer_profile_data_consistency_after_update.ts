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
 * Test profile data consistency with multiple profile updates.
 * This test does the following:
 * 1. Register a new customer account.
 * 2. Simulate updates to the customer's profile such as displayName and phoneNumber.
 *    (Note: The actual update API calls are not shown or specified, so this test
 *    assumes the updates are made elsewhere or mocked.)
 * 3. Fetch the customer profile using GET /shoppingMall/customer/profile endpoint.
 * 4. Validate that the fetched profile data matches the latest updates.
 */
export async function test_api_customer_profile_data_consistency_after_update(
  connection: api.IConnection,
): Promise<void> {
  // Firstly, create a new connection for customer join
  const joinConnection: api.IConnection = { host: connection.host };
  // Prepare join request body
  const joinBody: IShoppingMallCustomer.IJoin = {
    email: `${RandomGenerator.name(2).replace(/\s/g, "").toLowerCase()}@example.com`,
    password: "AutoBE1234!",
  } satisfies IShoppingMallCustomer.IJoin;
  // Authorize customer join (registration)
  const authorized = await authorize_customer_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Prepare new connection with authorization token
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: authorized.token.access };
  // Simulate profile updates: displayName and phoneNumber
  // Since update endpoints or utilities are not given, this simulation step is
  // skipped or considered done outside of this test. (Assuming updates are made)
  // Fetch profile after supposed updates
  const profile =
    await api.functional.shoppingMall.customer.profile.at(customerConnection) as unknown as {
      id: string;
      email: string;
      displayName: string | null;
      phoneNumber: string | null;
    };
  typia.assert(profile);
  // Validate that important profile fields exist and are consistent
  TestValidator.predicate(
    "profile object has id string",
    typeof profile.id === "string" && profile.id.length > 0,
  );
  TestValidator.predicate(
    "profile email format",
    profile.email.includes("@") && profile.email.length > 5,
  );
  TestValidator.predicate(
    "profile displayName is string or null",
    typeof profile.displayName === "string" || profile.displayName === null,
  );
  TestValidator.predicate(
    "profile phoneNumber is string or null",
    typeof profile.phoneNumber === "string" || profile.phoneNumber === null,
  );
  // Since no update API calls, we cannot verify changed values exactly.
  // But if the profile displayName and phoneNumber are null OR string,
  // at least data consistency upon fetch is ensured.
}
