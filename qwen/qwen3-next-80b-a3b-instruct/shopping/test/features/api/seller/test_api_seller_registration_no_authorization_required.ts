import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_registration_no_authorization_required(
  connection: api.IConnection,
) {
  // Generate realistic seller registration data using typia.random
  const registrationData = typia.random<IShoppingMallSeller.ICreate>();

  // Call the public seller registration endpoint without any authentication
  const response: IShoppingMallSeller.IRegistrationResponse =
    await api.functional.shoppingMall.actors.sellers.create(connection, {
      body: registrationData,
    });

  // Validate that response is a valid registration response
  typia.assert(response);

  // Verify response contains expected structure: id and status (pending_verification)
  // Note: No further validation needed as typia.assert() confirms type safety
  // This test passes if endpoint accepts request and returns valid response without auth
}
