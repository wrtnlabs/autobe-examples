import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller login failure with incorrect password.
 *
 * This test validates that authentication fails when providing a valid email
 * but incorrect password. The system should return an appropriate error
 * response without revealing whether the email exists in the system. The test
 * ensures that no tokens are issued and the response indicates authentication
 * failure.
 */
export async function test_api_seller_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Create a seller account for testing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "correctPassword123";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.paragraph({ sentences: 3 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 2 }),
      tax_id: undefined,
      ip: undefined,
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri"> as string & tags.Format<"uri">,
      referrer: "https://example.com" satisfies string &
        tags.Format<"uri"> as string & tags.Format<"uri">,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Attempt login with incorrect password and validate failure
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email: sellerEmail,
          password: "wrongPassword456", // Incorrect password
          ip: undefined,
          device: undefined,
          href: "https://example.com/login" satisfies string &
            tags.Format<"uri"> as string & tags.Format<"uri">,
          referrer: "https://example.com" satisfies string &
            tags.Format<"uri"> as string & tags.Format<"uri">,
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );

  // The test focuses exclusively on authentication failure scenario
  // No successful login validation is included as per the test requirements
}
