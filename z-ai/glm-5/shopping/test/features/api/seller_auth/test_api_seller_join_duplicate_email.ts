import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller registration rejection when using an email already registered by another seller.
 *
 * Test Execution Flow:
 * 1. First registration: Submit seller registration with unique email
 * 2. Verify first registration succeeds with approvalStatus='pending'
 * 3. Second registration: Submit another seller registration with the SAME email
 * 4. Verify the system rejects the duplicate registration with appropriate error response
 *
 * Business Rules Validated:
 * - Email uniqueness across all seller accounts is enforced
 * - Prevention of duplicate seller accounts
 * - System correctly identifies and rejects duplicate email attempts
 */
export async function test_api_seller_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique email for this test
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  // Create connection for first seller registration
  const seller1Connection: api.IConnection = { host: connection.host };
  // First registration: Register a new seller account with the email
  const firstSeller = await authorize_seller_join(seller1Connection, {
    body: {
      email: duplicateEmail,
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(firstSeller);
  // Verify first registration succeeded with pending status
  TestValidator.equals(
    "first seller approval status",
    firstSeller.approvalStatus,
    "pending",
  );
  // Create connection for second seller registration attempt
  const seller2Connection: api.IConnection = { host: connection.host };
  // Second registration: Attempt to register another seller with the same email
  // This should fail because the email is already taken
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await authorize_seller_join(seller2Connection, {
        body: {
          email: duplicateEmail,
          password: RandomGenerator.alphaNumeric(16),
          shop_name: RandomGenerator.name(),
        },
      });
    },
  );
}
