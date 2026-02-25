import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator registration with duplicate email address.
 *
 * This test validates that the system correctly prevents duplicate email
 * registrations for administrator accounts. The business rule requires
 * that each administrator email must be unique across all admin accounts.
 *
 * Test Flow:
 * 1. Register first administrator with a specific email
 * 2. Attempt to register second administrator with the same email
 * 3. Verify the second registration fails with appropriate error
 *
 * Expected Outcome:
 * - First registration succeeds and returns valid authorization tokens
 * - Second registration attempt fails with duplicate email error
 * - Email uniqueness constraint is properly enforced
 */
export async function test_api_admin_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate a fixed email to use for both registration attempts
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  // Step 1: Create first connection and register first admin successfully
  const firstConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_admin_join(firstConnection, {
    body: {
      email: duplicateEmail,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstAdmin);
  // Verify first admin was created with correct email
  TestValidator.equals("first admin email", firstAdmin.email, duplicateEmail);
  // Step 2: Attempt to register second admin with the same email - should fail
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await authorize_admin_join(secondConnection, {
        body: {
          email: duplicateEmail,
          password: RandomGenerator.alphaNumeric(16),
          name: RandomGenerator.name(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      });
    },
  );
}
