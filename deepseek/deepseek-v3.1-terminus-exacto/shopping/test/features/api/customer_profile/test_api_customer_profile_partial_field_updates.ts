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

/**
 * Test customer profile partial field updates.
 *
 * Verifies partial updates work correctly where only specific fields are updated
 * while others remain unchanged. Tests separation of concerns by updating
 * display_name independently from phone_number and validating persistence.
 */
export async function test_api_customer_profile_partial_field_updates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      display_name: typia.random<
        string & tags.MinLength<2> & tags.MaxLength<50>
      >(),
      phone_number: typia.random<string>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // 2. Update only display_name and verify phone_number unchanged
  const newDisplayName = typia.random<
    string & tags.MinLength<2> & tags.MaxLength<50>
  >();
  const updatedProfileDisplay =
    await api.functional.ecommerce.customer.profile.update(customerConnection, {
      body: {
        display_name: newDisplayName,
      } satisfies IEcommerceCustomer.IUpdate,
    });
  typia.assert(updatedProfileDisplay);
  // Verify display_name changed but phone_number unchanged
  TestValidator.equals(
    "display name updated",
    updatedProfileDisplay.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone number unchanged",
    updatedProfileDisplay.phone_number,
    customer.phone_number,
  );
  // 3. Update only phone_number and verify display_name unchanged
  const newPhoneNumber = typia.random<string>();
  const updatedProfilePhone =
    await api.functional.ecommerce.customer.profile.update(customerConnection, {
      body: {
        phone_number: newPhoneNumber,
      } satisfies IEcommerceCustomer.IUpdate,
    });
  typia.assert(updatedProfilePhone);
  // Verify phone_number changed but display_name unchanged
  TestValidator.equals(
    "phone number updated",
    updatedProfilePhone.phone_number,
    newPhoneNumber,
  );
  TestValidator.equals(
    "display name unchanged",
    updatedProfilePhone.display_name,
    newDisplayName,
  );
  // 4. Test partial updates combination
  const combinedDisplayName = typia.random<
    string & tags.MinLength<2> & tags.MaxLength<50>
  >();
  const combinedPhoneNumber = typia.random<string>();
  const partialUpdate = await api.functional.ecommerce.customer.profile.update(
    customerConnection,
    {
      body: {
        display_name: combinedDisplayName,
        phone_number: combinedPhoneNumber,
      } satisfies IEcommerceCustomer.IUpdate,
    },
  );
  typia.assert(partialUpdate);
  // Verify both fields updated correctly
  TestValidator.equals(
    "both fields updated display",
    partialUpdate.display_name,
    combinedDisplayName,
  );
  TestValidator.equals(
    "both fields updated phone",
    partialUpdate.phone_number,
    combinedPhoneNumber,
  );
  // Validate partial updates work correctly
  TestValidator.predicate(
    "partial update preserves system fields",
    partialUpdate.id === customer.id &&
      partialUpdate.email === customer.email &&
      partialUpdate.created_at === customer.created_at,
  );
}
