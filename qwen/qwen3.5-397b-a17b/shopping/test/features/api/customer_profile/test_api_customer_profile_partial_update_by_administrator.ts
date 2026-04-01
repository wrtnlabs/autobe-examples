import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an administrator can perform partial updates on customer profile
 * by updating only one field (display_name or phone_number) while leaving
 * the other unchanged.
 *
 * Preconditions:
 * - Administrator account exists and is authenticated
 * - Customer account exists with an active profile
 *
 * Test Steps:
 * 1. Administrator registers and authenticates via join endpoint
 * 2. Customer account is created with initial profile
 * 3. Administrator calls PUT with only display_name updated (phone_number omitted)
 * 4. Verify response returns profile with new display_name but original phone_number unchanged
 * 5. Repeat test with only phone_number updated (display_name omitted)
 * 6. Verify response returns profile with original display_name but new phone_number
 *
 * Validation Points:
 * - Partial update succeeds without requiring both fields
 * - Unspecified fields retain their original values
 * - updated_at timestamp is updated on each modification
 */
export async function test_api_customer_profile_partial_update_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Customer account creation with initial profile
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // Store original profile values
  const originalDisplayName = customerJoin.profile.display_name;
  const originalPhoneNumber = customerJoin.profile.phone_number;
  const originalUpdatedAt = customerJoin.profile.updated_at;
  // Verify initial profile state
  TestValidator.equals(
    "original display name",
    customerJoin.profile.display_name,
    originalDisplayName,
  );
  TestValidator.equals(
    "original phone number",
    customerJoin.profile.phone_number,
    originalPhoneNumber,
  );
  // 3. First partial update: Update only display_name (omit phone_number)
  const newDisplayName = RandomGenerator.name();
  const updatedProfile1 =
    await api.functional.shoppingMall.administrator.customers.profiles.update(
      adminConnection,
      {
        body: {
          display_name: newDisplayName,
          // phone_number intentionally omitted for partial update test
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile1);
  // 4. Verify first partial update results
  TestValidator.equals(
    "display_name updated",
    updatedProfile1.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone_number unchanged after display_name update",
    updatedProfile1.phone_number,
    originalPhoneNumber,
  );
  TestValidator.predicate(
    "updated_at changed after first update",
    updatedProfile1.updated_at > originalUpdatedAt,
  );
  // 5. Second partial update: Update only phone_number (omit display_name)
  const newPhoneNumber = RandomGenerator.mobile();
  const updatedProfile2 =
    await api.functional.shoppingMall.administrator.customers.profiles.update(
      adminConnection,
      {
        body: {
          phone_number: newPhoneNumber,
          // display_name intentionally omitted for partial update test
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile2);
  // 6. Verify second partial update results
  TestValidator.equals(
    "display_name unchanged after phone_number update",
    updatedProfile2.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone_number updated",
    updatedProfile2.phone_number,
    newPhoneNumber,
  );
  TestValidator.predicate(
    "updated_at changed after second update",
    updatedProfile2.updated_at > updatedProfile1.updated_at,
  );
  // Final validation: Ensure partial updates work correctly
  TestValidator.notEquals(
    "profile changed from original",
    updatedProfile2.display_name,
    originalDisplayName,
  );
  TestValidator.notEquals(
    "phone changed from original",
    updatedProfile2.phone_number,
    originalPhoneNumber,
  );
}
