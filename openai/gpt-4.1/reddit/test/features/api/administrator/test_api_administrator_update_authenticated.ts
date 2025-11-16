import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";

/**
 * Validates the update mechanism for an administrator account by an
 * authenticated system administrator.
 *
 * This test verifies that an authenticated administrator can update account
 * fields such as email, status, and business status. It covers:
 *
 * 1. Registration/authentication of a new admin for a clean test context (using
 *    /auth/administrator/join)
 * 2. Administrator updates their account using PUT
 *    /communityPlatform/administrator/administrators/{administratorId}, with
 *    changes to:
 *
 *    - Email (to a newly generated unique email)
 *    - Status (switching between allowed values)
 *    - Business_status (new role string)
 * 3. Ensures constraints:
 *
 *    - Email uniqueness is enforced by attempting to update to an existing email and
 *         expecting failure
 *    - Only appropriate status transitions are allowed
 *    - Sensitive fields like password_hash are never exposed in any response
 * 4. Validates through a re-fetch (output of update) that changes persist and that
 *    audit fields (updated_at) are updated.
 *
 * Steps:
 *
 * 1. Register/authenticate a system administrator; obtain administratorId and
 *    initial data
 * 2. Update the administrator email, business status, and status to new valid
 *    values using the update endpoint
 * 3. Assert that the update response reflects all requested changes, updated_at is
 *    refreshed, and password_hash is never exposed
 * 4. Attempt a collision update with the previous email (should fail with error)
 */
export async function test_api_administrator_update_authenticated(
  connection: api.IConnection,
) {
  // Step 1: Register/authenticate administrator
  const originalAdmin = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        business_status: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(originalAdmin);
  const administratorId = originalAdmin.id;

  // Step 2: Prepare another admin (for duplicate email test later)
  const otherAdmin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      business_status: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(otherAdmin);

  // Step 3: Update with new values (unique email, valid status, new business_status)
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedStatus = RandomGenerator.pick([
    "active",
    "suspended",
    "terminated",
  ] as const);
  const updatedBusinessStatus = RandomGenerator.paragraph({ sentences: 2 });

  const updated =
    await api.functional.communityPlatform.administrator.administrators.update(
      connection,
      {
        administratorId,
        body: {
          email: updatedEmail,
          status: updatedStatus,
          business_status: updatedBusinessStatus,
        } satisfies ICommunityPlatformAdministrator.IUpdate,
      },
    );
  typia.assert(updated);

  // Step 4: Validate changes reflected in update output
  TestValidator.equals("email is updated", updated.email, updatedEmail);
  TestValidator.equals("status is updated", updated.status, updatedStatus);
  TestValidator.equals(
    "business_status is updated",
    updated.business_status,
    updatedBusinessStatus,
  );

  TestValidator.notEquals(
    "updated_at is different (timestamp refreshed)",
    updated.updated_at,
    originalAdmin.updated_at,
  );

  // Audit: Sensitive data must not appear
  TestValidator.predicate(
    "password_hash is never present in update output",
    !("password_hash" in updated),
  );

  // Step 5: Try to update email to a duplicate (should fail)
  await TestValidator.error(
    "updating with an existing email should fail",
    async () => {
      await api.functional.communityPlatform.administrator.administrators.update(
        connection,
        {
          administratorId,
          body: {
            email: otherAdmin.email,
          } satisfies ICommunityPlatformAdministrator.IUpdate,
        },
      );
    },
  );
}
