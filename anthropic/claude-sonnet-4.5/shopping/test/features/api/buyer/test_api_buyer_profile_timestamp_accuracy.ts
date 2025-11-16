import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test that buyer profile timestamps are correctly set and formatted.
 *
 * This test validates the timestamp accuracy and format in buyer profiles by:
 *
 * 1. Creating a new buyer account through registration
 * 2. Immediately retrieving the buyer profile
 * 3. Verifying created_at and updated_at timestamps are in ISO 8601 format
 * 4. Confirming created_at equals updated_at (no modifications yet)
 * 5. Validating deleted_at is null for active accounts
 * 6. Ensuring timestamps are reasonable relative to registration time
 */
export async function test_api_buyer_profile_timestamp_accuracy(
  connection: api.IConnection,
) {
  // Record the current time before registration for validation
  const beforeRegistration = new Date();

  // Create a new buyer account
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: typia.random<string & tags.MinLength<2> & tags.MaxLength<100>>(),
    phone_number: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const authorizedBuyer = await api.functional.auth.buyer.join(connection, {
    body: registrationData,
  });
  typia.assert(authorizedBuyer);

  // Record time after registration
  const afterRegistration = new Date();

  // Validate the authorized buyer response has proper timestamps
  TestValidator.predicate(
    "created_at should be present",
    authorizedBuyer.created_at !== null &&
      authorizedBuyer.created_at !== undefined,
  );

  TestValidator.predicate(
    "updated_at should be present",
    authorizedBuyer.updated_at !== null &&
      authorizedBuyer.updated_at !== undefined,
  );

  // Parse timestamps to validate ISO 8601 format
  const createdAtDate = new Date(authorizedBuyer.created_at);
  const updatedAtDate = new Date(authorizedBuyer.updated_at);

  // Validate timestamps are valid dates
  TestValidator.predicate(
    "created_at should be valid ISO 8601 date-time",
    !isNaN(createdAtDate.getTime()),
  );

  TestValidator.predicate(
    "updated_at should be valid ISO 8601 date-time",
    !isNaN(updatedAtDate.getTime()),
  );

  // Validate timestamps are within reasonable time range
  TestValidator.predicate(
    "created_at should be after or equal to registration start time",
    createdAtDate.getTime() >= beforeRegistration.getTime() - 1000,
  );

  TestValidator.predicate(
    "created_at should be before or equal to registration end time",
    createdAtDate.getTime() <= afterRegistration.getTime() + 1000,
  );

  // Validate created_at equals updated_at (no updates occurred)
  TestValidator.equals(
    "created_at should equal updated_at initially",
    authorizedBuyer.created_at,
    authorizedBuyer.updated_at,
  );

  // Validate deleted_at is null for active account
  TestValidator.equals(
    "deleted_at should be null for active account",
    authorizedBuyer.deleted_at,
    null,
  );

  // Retrieve the buyer profile to verify consistency
  const buyerProfile = await api.functional.shoppingMall.buyer.buyers.at(
    connection,
    {
      buyerId: authorizedBuyer.id,
    },
  );
  typia.assert(buyerProfile);

  // Validate retrieved profile timestamps match registration response
  TestValidator.equals(
    "profile created_at should match registration response",
    buyerProfile.created_at,
    authorizedBuyer.created_at,
  );

  TestValidator.equals(
    "profile updated_at should match registration response",
    buyerProfile.updated_at,
    authorizedBuyer.updated_at,
  );

  TestValidator.equals(
    "profile deleted_at should remain null",
    buyerProfile.deleted_at,
    null,
  );

  // Validate profile timestamps are still equal
  TestValidator.equals(
    "profile created_at should equal updated_at",
    buyerProfile.created_at,
    buyerProfile.updated_at,
  );
}
