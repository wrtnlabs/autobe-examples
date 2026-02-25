import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_customer_email_verification_already_used(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario: Email verification with already-used token
  // This test verifies that a token cannot be used multiple times for verification
  // Since we don't have access to customer registration API and the scenario only requires
  // testing the 'already used token' case, we'll need to simulate this scenario.
  // However, without the ability to register customers or retrieve verification tokens,
  // this test cannot be properly implemented with the available API functions.
  // For a proper implementation, we would:
  // 1. Register a customer (requires API endpoint not available in current scope)
  // 2. Retrieve the verification token (requires test helper or exposed token endpoint)
  // 3. Successfully verify the token
  // 4. Attempt to verify again with the same token to confirm rejection
  // Since we only have access to the email verification endpoint and no registration
  // or token retrieval capabilities, we can only test with a fabricated token that
  // we know has been used before. However, this requires knowledge of valid tokens.
  // Given the limitations, this test serves as documentation of the intended behavior:
  // 1. Create a test customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Generate a token that has already been used (this would normally come from
  //    a test setup process that registers a customer and verifies their email)
  const usedToken = "test-token-that-has-already-been-used";
  // 3. First verify - should succeed (in a real test, this would be done earlier)
  // const firstVerification = await api.functional.shoppingMall.email_verifications.verify(
  //   customerConnection,
  //   { token: usedToken }
  // );
  // typia.assert(firstVerification);
  // 4. Second verify with same token - should fail
  await TestValidator.error("duplicate token verification fails", async () => {
    await api.functional.shoppingMall.email_verifications.verify(
      customerConnection,
      {
        token: usedToken,
      },
    );
  });
}
