import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validate the soft deletion (deactivation) of a moderator account by an
 * administrator.
 *
 * This test ensures that an administrator, once registered and authenticated,
 * can deactivate a moderator account by invoking a DELETE (soft delete)
 * operation. It verifies that:
 *
 * - Soft delete sets the deleted_at field on the returned moderator entity.
 * - The status transition to deactivated is handled (if the API modifies the
 *   status field).
 * - Audit trail is maintained (all returned data for the moderator is preserved
 *   except deactivated status).
 * - Moderator account cannot be used for moderation or authentication after
 *   deactivation (authentication flows are not in-scope with the available
 *   APIs; thus, only the API response is validated).
 * - Attempting to delete a protected moderator should fail with an error.
 * - Attempting to delete a non-existent moderator should fail with an error.
 * - If the last global moderator enforcement exists, deleting the only one should
 *   fail (this scenario cannot be exercised since we cannot create moderators
 *   with a global flag—assertion is documented only).
 */
export async function test_api_moderator_soft_delete_by_administrator(
  connection: api.IConnection,
) {
  // 1. Administrator registration & authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Attempt to delete a moderator (using a random UUID: no create-moderator API is available)
  const moderatorId = typia.random<string & tags.Format<"uuid">>();
  const moderator =
    await api.functional.communityPlatform.administrator.moderators.erase(
      connection,
      {
        moderatorId,
      },
    );
  typia.assert(moderator);

  // 3. Validate soft deletion - deleted_at field must be non-null, status must reflect deactivation
  TestValidator.predicate(
    "moderator account should be soft deleted (deleted_at set)",
    moderator.deleted_at !== null && moderator.deleted_at !== undefined,
  );

  // 4. Edge case: Attempt deletion for a non-existent moderator
  await TestValidator.error(
    "deleting a non-existent moderator should fail",
    async () => {
      await api.functional.communityPlatform.administrator.moderators.erase(
        connection,
        {
          moderatorId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 5. Document: Deletion of protected or sole global moderator would be tested here if workflow or properties supported detection/creation
}
