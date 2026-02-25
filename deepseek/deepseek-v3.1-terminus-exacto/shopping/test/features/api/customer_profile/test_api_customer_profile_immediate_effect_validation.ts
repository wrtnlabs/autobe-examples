import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_immediate_effect_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and register
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);
  // Store original values
  const originalDisplayName = customer.display_name;
  const originalPhoneNumber = customer.phone_number;
  // Generate new profile data
  const newDisplayName = RandomGenerator.name();
  const newPhoneNumber = RandomGenerator.mobile();
  // Update profile with new values
  const updatedCustomer =
    await api.functional.ecommerce.customer.profile.update(customerConnection, {
      body: {
        display_name: newDisplayName,
        phone_number: newPhoneNumber,
      } satisfies IEcommerceCustomer.IUpdate,
    });
  typia.assert(updatedCustomer);
  // Validate immediate effect - updated values should match
  TestValidator.equals(
    "display name should be updated",
    updatedCustomer.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone number should be updated",
    updatedCustomer.phone_number,
    newPhoneNumber,
  );
  // Validate that original values are no longer present
  TestValidator.notEquals(
    "display name should be different from original",
    updatedCustomer.display_name,
    originalDisplayName,
  );
  TestValidator.notEquals(
    "phone number should be different from original",
    updatedCustomer.phone_number,
    originalPhoneNumber,
  );
  // Test session consistency using same connection
  const secondProfileUpdate =
    await api.functional.ecommerce.customer.profile.update(customerConnection, {
      body: {
        display_name: RandomGenerator.name(),
      } satisfies IEcommerceCustomer.IUpdate,
    });
  typia.assert(secondProfileUpdate);
  // Verify that previous updates persist
  TestValidator.equals(
    "phone number should persist across updates",
    secondProfileUpdate.phone_number,
    newPhoneNumber,
  );
  // Test partial update - update only phone number
  const partialPhoneNumber = RandomGenerator.mobile();
  const partiallyUpdatedCustomer =
    await api.functional.ecommerce.customer.profile.update(customerConnection, {
      body: {
        phone_number: partialPhoneNumber,
      } satisfies IEcommerceCustomer.IUpdate,
    });
  typia.assert(partiallyUpdatedCustomer);
  // Validate partial update
  TestValidator.equals(
    "phone number should be partially updated",
    partiallyUpdatedCustomer.phone_number,
    partialPhoneNumber,
  );
  TestValidator.equals(
    "display name should remain from previous update",
    partiallyUpdatedCustomer.display_name,
    secondProfileUpdate.display_name,
  );
  // Verify timestamps are updated correctly
  TestValidator.predicate(
    "updated_at should be recent",
    new Date(partiallyUpdatedCustomer.updated_at) >
      new Date(updatedCustomer.updated_at),
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    partiallyUpdatedCustomer.created_at,
    customer.created_at,
  );
  // Test that immutable fields remain unchanged
  TestValidator.equals(
    "id should remain unchanged",
    partiallyUpdatedCustomer.id,
    customer.id,
  );
  TestValidator.equals(
    "email should remain unchanged",
    partiallyUpdatedCustomer.email,
    customer.email,
  );
}
