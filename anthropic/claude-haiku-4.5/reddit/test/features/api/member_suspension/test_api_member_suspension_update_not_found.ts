import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Tests updating a non-existent member suspension returns 404 Not Found.
 *
 * This test validates proper error handling when attempting to update a member
 * suspension that does not exist. The scenario:
 *
 * 1. Creates a moderator account for authentication
 * 2. Attempts to update a suspension using a non-existent but valid UUID
 * 3. Verifies that a 404 error is returned with appropriate error message
 *
 * This ensures the API properly validates resource existence before allowing
 * updates and returns appropriate HTTP error codes for invalid references.
 */
export async function test_api_member_suspension_update_not_found(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Attempt to update a non-existent suspension
  const nonExistentSuspensionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Verify 404 error is returned for non-existent suspension
  await TestValidator.httpError(
    "should return 404 for non-existent suspension",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.memberSuspensions.update(
        connection,
        {
          suspensionId: nonExistentSuspensionId,
          body: {
            suspension_reason: RandomGenerator.paragraph({
              sentences: 3,
              wordMin: 5,
              wordMax: 10,
            }),
          } satisfies ICommunityPlatformMemberSuspension.IUpdate,
        },
      );
    },
  );
}
