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
 * Test successful customer profile update where an authenticated customer
 * updates both their display name and phone number.
 *
 * This test validates:
 * 1. Customer registration and authentication
 * 2. Profile update with new displayName and phoneNumber
 * 3. Response contains updated nickname and phone_number fields
 * 4. updated_at timestamp changes from original registration time
 */
export async function test_api_customer_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer and get authenticated connection
  const authorized = await authorize_customer_join(connection, {
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
  typia.assert(authorized);
  // Store original timestamps for comparison
  const originalUpdatedAt = authorized.updated_at;
  const originalNickname = authorized.nickname;
  const originalPhoneNumber = authorized.phone_number;
  // 2. Prepare profile update with new values
  const newNickname = RandomGenerator.name();
  const newPhoneNumber = RandomGenerator.mobile();
  const updateBody = {
    displayName: newNickname,
    phoneNumber: newPhoneNumber,
  } satisfies IShoppingMallCustomer.IUpdate;
  // 3. Update customer profile
  // Note: authorize_customer_join already set the token in connection.headers
  const updatedProfile =
    await api.functional.shoppingMall.customer.customers.profile.update(
      connection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate updated fields match input
  TestValidator.equals(
    "nickname updated",
    updatedProfile.nickname,
    newNickname,
  );
  TestValidator.equals(
    "phone_number updated",
    updatedProfile.phone_number,
    newPhoneNumber,
  );
  // 5. Validate other fields remain unchanged
  TestValidator.equals(
    "email unchanged",
    updatedProfile.email,
    authorized.email,
  );
  TestValidator.equals("id unchanged", updatedProfile.id, authorized.id);
  // 6. Validate updated_at timestamp has changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedProfile.updated_at,
    originalUpdatedAt,
  );
  // 7. Validate created_at remains unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedProfile.created_at,
    authorized.created_at,
  );
  // 8. Validate deleted_at is still null (account not deleted)
  TestValidator.equals("deleted_at is null", updatedProfile.deleted_at, null);
}
