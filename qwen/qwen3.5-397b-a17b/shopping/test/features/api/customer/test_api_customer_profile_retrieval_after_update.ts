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
 * Test customer profile retrieval after update.
 *
 * This test validates that:
 * 1. A customer can register and obtain authentication
 * 2. A customer can update their profile (displayName and phoneNumber)
 * 3. The updated profile values are persisted correctly
 * 4. The profile retrieval endpoint returns the updated values
 *
 * Workflow:
 * - Register new customer using authorize_customer_join
 * - Update profile with new displayName and phoneNumber
 * - Retrieve profile and verify updated values match
 */
export async function test_api_customer_profile_retrieval_after_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(customerConnection, {
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
  typia.assert(joinResult);
  // 2. Prepare updated profile values
  const newDisplayName = RandomGenerator.name();
  const newPhoneNumber = RandomGenerator.mobile();
  // 3. Update customer profile
  const updateResult =
    await api.functional.shoppingMall.customer.customers.profile.update(
      customerConnection,
      {
        body: {
          displayName: newDisplayName,
          phoneNumber: newPhoneNumber,
        } satisfies IShoppingMallCustomer.IUpdate,
      },
    );
  typia.assert(updateResult);
  // 4. Verify update response contains new values
  TestValidator.equals(
    "updated nickname",
    updateResult.nickname,
    newDisplayName,
  );
  TestValidator.equals(
    "updated phone_number",
    updateResult.phone_number,
    newPhoneNumber,
  );
  // 5. Retrieve profile to verify persistence
  const profileResult =
    await api.functional.shoppingMall.customer.profile.at(customerConnection);
  typia.assert(profileResult);
  // 6. Verify retrieved profile matches updated values
  TestValidator.equals(
    "retrieved nickname matches update",
    profileResult.nickname,
    newDisplayName,
  );
  TestValidator.equals(
    "retrieved phone_number matches update",
    profileResult.phone_number,
    newPhoneNumber,
  );
  // 7. Verify profile values differ from original registration
  TestValidator.notEquals(
    "nickname changed from registration",
    joinResult.nickname,
    newDisplayName,
  );
  TestValidator.notEquals(
    "phone_number changed from registration",
    joinResult.phone_number,
    newPhoneNumber,
  );
}
