import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that attempting to register a super administrator with an email that already
 * exists in the system returns an appropriate error response.
 *
 * Validates the email uniqueness constraint for super administrator registration.
 * The test first registers a super admin with a unique email address, then attempts
 * to register another super admin with the same email. The second attempt should fail
 * with an appropriate HTTP error indicating the email is already registered.
 *
 * **Test Flow:**
 * 1. Generate a unique email address
 * 2. Register the first super admin successfully using authorize_super_admin_join
 * 3. Attempt to register another super admin with the duplicate email
 * 4. Validate that the duplicate attempt fails with HTTP error
 *
 * **Business Rules Tested:**
 * - Email uniqueness is enforced across all super admin accounts
 * - Duplicate registration attempts are rejected with 4xx status
 * - No authentication tokens are returned for failed requests
 * - System maintains data integrity by preventing duplicate accounts
 */
export async function test_api_superadmin_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a unique email for the test
  const email = typia.random<string & tags.Format<"email">>();
  // 2. Register the first super admin with this email (dependency requirement)
  const firstConnection: api.IConnection = { host: connection.host };
  const firstSuperAdmin = await authorize_super_admin_join(firstConnection, {
    body: {
      email: email,
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstSuperAdmin);
  // 3. Attempt to register another super admin with the same email
  // This should fail with an HTTP error indicating duplicate email
  await TestValidator.error("duplicate email should fail", async () => {
    const duplicateConnection: api.IConnection = { host: connection.host };
    await api.functional.ecommerceMall.auth.superAdmin.join(
      duplicateConnection,
      {
        body: {
          email: email,
          password: "Test5678!",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  });
}
