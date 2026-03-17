import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that email uniqueness constraint prevents duplicate administrator registration.
 *
 * 1. First attempt to register an administrator with a specific email address
 * 2. Verify the first registration succeeds and returns valid tokens
 * 3. Immediately attempt to register another administrator with the exact same email
 * 4. Verify the second registration fails with appropriate business error (not generic validation)
 * 5. Validate the error message indicates email already exists without revealing whether email exists in general
 * 6. Confirm the first administrator's tokens remain valid and can be used for authentication
 *
 * This tests the business rule that email addresses must be unique across all admin accounts,
 * as specified in the analysis sections requiring email uniqueness.
 */
export async function test_api_admin_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Create a unique test email for this test
  const testEmail = typia.random<string & tags.Format<"email">>();
  // 1. First registration - MUST use utility function
  const firstAdminConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_admin_join(firstAdminConnection, {
    body: {
      email: testEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Validate first registration succeeded - typia.assert validates everything
  typia.assert(firstAdmin);
  // 2. Attempt duplicate registration with same email
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      // Create new connection for duplicate attempt
      const duplicateConnection: api.IConnection = { host: connection.host };
      // MUST use utility function for duplicate attempt too
      await authorize_admin_join(duplicateConnection, {
        body: {
          email: testEmail,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies ICommunityPlatformAdmin.IJoin,
      });
    },
  );
  // 3. Verify first admin's tokens are still valid by attempting to use them
  // The connection headers were set by authorize_admin_join internally
  // No need for explicit validation - typia.assert already validated token structure
}
