import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Test karma history retrieval for a non-existent member ID.
 *
 * Validates that when a moderator requests karma history for an invalid or
 * non-existent member ID, the endpoint returns an appropriate error response.
 * This test ensures the endpoint properly validates the memberId parameter
 * format and existence before attempting retrieval.
 *
 * Workflow:
 *
 * 1. Register and authenticate as a moderator
 * 2. Attempt to retrieve karma history for a non-existent member using a valid
 *    UUID
 * 3. Verify that the endpoint rejects the request with an appropriate error
 * 4. Confirm error handling works correctly for invalid member references
 */
export async function test_api_karma_history_moderator_member_not_found(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorData = {
    email: moderatorEmail,
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Generate a non-existent member ID (valid UUID format)
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to retrieve karma history for non-existent member
  // The endpoint should return an error
  await TestValidator.error(
    "should return error when requesting karma history for non-existent member",
    async () => {
      await api.functional.communityPlatform.moderator.members.karmaHistory.at(
        connection,
        {
          memberId: nonExistentMemberId,
        },
      );
    },
  );
}
