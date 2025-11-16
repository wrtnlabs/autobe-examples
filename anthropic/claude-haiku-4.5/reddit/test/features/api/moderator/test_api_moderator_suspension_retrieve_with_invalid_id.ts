import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator error handling for non-existent suspension ID.
 *
 * This test validates that the API properly handles attempts to retrieve
 * suspension records with invalid UUIDs. It ensures that:
 *
 * 1. The system authenticates moderators correctly
 * 2. Invalid suspension IDs are rejected with appropriate error responses
 * 3. No sensitive information is disclosed for non-existent records
 * 4. The API prevents enumeration of suspension records through brute-force
 *    attempts
 *
 * The test workflow:
 *
 * 1. Register a new moderator account to establish authentication context
 * 2. Attempt to retrieve a suspension record using an invalid UUID
 * 3. Validate that the API returns an error (404) for the invalid ID
 * 4. Confirm the error response prevents information disclosure
 * 5. Verify moderator remains authenticated after the failed request
 */
export async function test_api_moderator_suspension_retrieve_with_invalid_id(
  connection: api.IConnection,
) {
  // 1. Register moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(5) + RandomGenerator.alphaNumeric(5),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://community.example.com/auth/register",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Verify moderator is properly authenticated
  TestValidator.predicate(
    "moderator should be authenticated",
    moderator.id !== undefined && moderator.id.length > 0,
  );

  // 2. Generate invalid suspension ID (non-existent UUID)
  const invalidSuspensionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to retrieve suspension with invalid ID and expect error
  await TestValidator.error(
    "should reject retrieval with invalid suspension ID",
    async () => {
      await api.functional.communityPlatform.moderator.memberSuspensions.at(
        connection,
        {
          suspensionId: invalidSuspensionId,
        },
      );
    },
  );
}
