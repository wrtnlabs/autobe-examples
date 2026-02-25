import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
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
 * Test successful customer profile update with valid display name and phone number.
 * The customer should be able to update both display_name and phone_number fields.
 * The system should validate display_name length (1-50 characters) and phone_number format.
 * After successful update, the updated_at timestamp should be updated and the updated
 * customer profile should be returned with all fields.
 */
export async function test_api_customer_profile_update_success(
  connection: IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerConnection: IConnection = { host: connection.host };
  const registeredCustomer =
    await api.functional.shoppingMall.auth.customer.join(customerConnection, {
      body: {
        email: (typia.random<string>() satisfies string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email"> as string) as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
        password: "12341234",
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(registeredCustomer);
  // 2. Get current profile to verify initial values
  const originalCustomer = registeredCustomer.customer;
  TestValidator.predicate("customer exists", originalCustomer !== undefined);
  // 3. Generate new profile data
  const newDisplayName = RandomGenerator.name();
  const newPhoneNumber = RandomGenerator.mobile();
  // 4. Update customer profile with new display name and phone number
  const updatedProfile =
    await api.functional.shoppingMall.customer.customers.profile.updateProfile(
      customerConnection,
      {
        body: {
          display_name: newDisplayName,
          phone_number: newPhoneNumber,
        } satisfies IShoppingMallCustomer.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 5. Validate that display_name and phone_number were updated
  TestValidator.notEquals(
    "display_name should be different",
    originalCustomer.display_name,
    updatedProfile.display_name,
  );
  TestValidator.equals(
    "new display_name matches",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.notEquals(
    "phone_number should be different",
    originalCustomer.phone_number,
    updatedProfile.phone_number,
  );
  TestValidator.equals(
    "new phone_number matches",
    updatedProfile.phone_number,
    newPhoneNumber,
  );
  // 6. Validate updated_at timestamp was updated
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(updatedProfile.updated_at) > new Date(updatedProfile.created_at),
  );
  // 7. Validate all other fields remained consistent
  TestValidator.equals(
    "email matches",
    updatedProfile.email,
    originalCustomer.email,
  );
  TestValidator.equals(
    "email_verified matches",
    updatedProfile.email_verified,
    originalCustomer.email_verified,
  );
  TestValidator.equals("id matches", updatedProfile.id, originalCustomer.id);
}