import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallEmailVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerify";
import type { IShoppingMallEmailVerifyResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerifyResponse";

/**
 * Test partial customer profile update with selective field modification.
 *
 * This test validates the API's ability to update specific customer profile
 * fields while preserving unchanged fields. The focus is on ensuring that only
 * the provided fields in the request are updated, while all others maintain
 * their original values.
 *
 * The test follows this workflow:
 *
 * 1. Create a new customer account with complete profile data
 * 2. Note the connection already has customer authentication from registration
 * 3. Perform a partial update modifying only first name and phone number
 * 4. Verify that the update succeeded by checking the updated fields
 * 5. Confirm that omitted fields (last name, birth date) remained unchanged
 *
 * This ensures the partial update mechanism works correctly for profile
 * maintenance and prevents unwanted field modifications when only specific
 * updates are intended.
 */
export async function test_api_customer_profile_partial_update(
  connection: api.IConnection,
) {
  // Step 1: Create a new customer account with complete initial data
  const initialEmail = "customer@example.com";
  const initialPassword = "securePassword123";
  const originalFirstName = "John";
  const originalLastName = "Doe";
  const originalPhone = "+1234567890";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: initialEmail,
      password: initialPassword,
      first_name: originalFirstName,
      last_name: originalLastName,
      phone: originalPhone,
      href: "https://example.com/reg",
      referrer: "https://example.com/ref",
      date_of_birth: "1990-01-01", // Date format, not date-time
    } satisfies IShoppingMallCustomer.IRegister,
  });
  typia.assert(customer);

  // Step 2: Note the authentication was set automatically by SDK during registration
  // The connection now has customer auth context, so we can proceed with updates

  // Step 3: Prepare partial update data - modifying only first name and phone
  const updatedFirstName = "Jane";
  const updatedPhone = "+1987654321";

  const updateData = {
    first_name: updatedFirstName,
    phone: updatedPhone,
  } satisfies IShoppingMallCustomer.IUpdate;

  // Step 4: Perform the partial profile update
  const updatedCustomer =
    await api.functional.shoppingMall.customer.customers.update(connection, {
      customerId: customer.id,
      body: updateData,
    });
  typia.assert(updatedCustomer);

  // Step 5: Verify the update results
  // Check that customer was returned with correct ID and updated fields
  TestValidator.equals("customer ID correct", updatedCustomer.id, customer.id);
  TestValidator.equals("email unchanged", updatedCustomer.email, initialEmail);

  // Name should contain the new first name (format will be "Firstname Lastname" based on DTO structure)
  TestValidator.predicate(
    "name contains new first name",
    updatedCustomer.name.includes(updatedFirstName),
  );

  // Phone should be updated to the new value
  TestValidator.equals(
    "phone number updated",
    updatedCustomer.phone,
    updatedPhone,
  );

  // Step 6: Verify that unspecified fields remained unchanged
  // Birth date should remain as set during registration
  TestValidator.equals(
    "birth date unchanged",
    updatedCustomer.birth_date,
    "1990-01-01",
  );

  // Verify key identifications like email verification shouldn't change
  TestValidator.equals(
    "email verification status unchanged",
    updatedCustomer.is_email_verified,
    customer.is_email_verified,
  );

  // Status and account type should be unchanged
  TestValidator.equals(
    "account type unchanged",
    updatedCustomer.account_type,
    customer.account_type,
  );

  // Step 7: Verify update timestamp was changed and is recent
  TestValidator.predicate(
    "updated_at timestamp updated",
    updatedCustomer.updated_at > customer.updated_at,
  );
  TestValidator.predicate(
    "updated_at not in future",
    updatedCustomer.updated_at <= new Date().toISOString(),
  );
}
