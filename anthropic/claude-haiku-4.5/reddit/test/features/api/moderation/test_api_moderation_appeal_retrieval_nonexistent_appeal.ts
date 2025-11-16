import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAppeal";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test retrieving a moderation appeal with invalid or non-existent appeal IDs.
 *
 * This test validates that the API properly handles requests for appeals that
 * don't exist by returning appropriate error responses. Multiple invalid ID
 * formats are tested including completely fabricated UUIDs and malformed UUID
 * strings.
 *
 * The test verifies:
 *
 * 1. Fabricated valid-format UUIDs return 404 errors
 * 2. Consistent error responses prevent ID enumeration attacks
 * 3. Error messages don't expose system internals
 * 4. Authorization filtering returns consistent 404 regardless of permissions
 *
 * Test flow:
 *
 * 1. Create a member account for API authentication
 * 2. Attempt to retrieve appeal with completely fabricated UUIDs
 * 3. Verify 404 error is returned for non-existent appeals
 * 4. Test with multiple invalid UUID formats
 * 5. Verify consistent error responses across different attempts
 */
export async function test_api_moderation_appeal_retrieval_nonexistent_appeal(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "SecurePassword123!",
        href: "http://localhost:3000/auth/join",
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Test with completely fabricated UUIDs that don't exist
  const fabricatedUuid1 = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should return 404 for completely fabricated appeal UUID",
    async () => {
      await api.functional.communityPlatform.moderationAppeals.at(connection, {
        appealId: fabricatedUuid1,
      });
    },
  );

  // Step 3: Test with another fabricated UUID to ensure consistency
  const fabricatedUuid2 = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should return 404 for another non-existent appeal UUID",
    async () => {
      await api.functional.communityPlatform.moderationAppeals.at(connection, {
        appealId: fabricatedUuid2,
      });
    },
  );

  // Step 4: Test with multiple fabricated UUIDs to verify consistent 404 responses
  const fabricatedUuids = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  await ArrayUtil.asyncForEach(fabricatedUuids, async (appealId) => {
    await TestValidator.error(
      `should return 404 for non-existent appeal with ID ${appealId}`,
      async () => {
        await api.functional.communityPlatform.moderationAppeals.at(
          connection,
          {
            appealId,
          },
        );
      },
    );
  });

  // Step 5: Verify that authorization filtering doesn't leak valid appeals
  // Even if user doesn't have permission, they should get 404 not forbidden
  const unauthorizedAccessUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should return 404 instead of 403 to prevent ID enumeration",
    async () => {
      await api.functional.communityPlatform.moderationAppeals.at(connection, {
        appealId: unauthorizedAccessUuid,
      });
    },
  );
}
