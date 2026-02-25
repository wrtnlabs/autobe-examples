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
 * Test customer profile update with both display name and phone number.
 *
 * This test validates the primary success path for customer profile update
 * where an authenticated customer updates both display name and phone number
 * in a single request.
 *
 * Test Flow:
 * 1. Create a new customer account via join endpoint
 * 2. Update the profile with valid display name and phone number (E.164 format)
 * 3. Verify the response contains the updated fields
 * 4. Verify the updated_at timestamp has changed
 * 5. Verify email remains unchanged
 */
export async function test_api_customer_profile_update_both_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account via join endpoint
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      displayName: null,
      phone: null,
    },
  });
  typia.assert(authorized);
  // Store original data for comparison
  const originalUpdatedAt = authorized.updatedAt;
  const originalEmail = authorized.email;
  // 2. Update profile with both display name and phone number
  const updateBody = {
    displayName: "John Doe",
    phoneNumber: "+1234567890",
  } satisfies IShoppingMallCustomer.IUpdate;
  const updatedCustomer =
    await api.functional.shoppingMall.customer.customers.me.update(
      customerConnection,
      { body: updateBody },
    );
  typia.assert(updatedCustomer);
  // 3. Verify the response contains the updated fields
  TestValidator.equals(
    "display name should be updated",
    updatedCustomer.displayName,
    "John Doe",
  );
  TestValidator.equals(
    "phone number should be updated",
    updatedCustomer.phoneNumber,
    "+1234567890",
  );
  // 4. Verify the updated_at timestamp has changed
  TestValidator.notEquals(
    "updated_at timestamp should change after update",
    updatedCustomer.updatedAt,
    originalUpdatedAt,
  );
  // 5. Verify email remains unchanged (identity preserved)
  TestValidator.equals(
    "email should remain unchanged",
    updatedCustomer.email,
    originalEmail,
  );
  // 6. Verify customer ID is preserved
  TestValidator.equals(
    "customer ID should remain unchanged",
    updatedCustomer.id,
    authorized.id,
  );
  // 7. Verify account is not soft-deleted
  TestValidator.equals(
    "account should not be deleted",
    updatedCustomer.deletedAt,
    null,
  );
}
