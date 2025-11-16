import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMemberProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberProfile";

/**
 * Test profile retrieval for a non-existent member ID.
 *
 * This scenario validates error handling when attempting to retrieve a profile
 * for an invalid or non-existent member ID. The test verifies that the
 * operation returns a 404 Not Found response, confirming that the system
 * properly validates the target member exists before returning profile data.
 *
 * Test steps:
 *
 * 1. Generate a random UUID that doesn't correspond to any existing member
 * 2. Attempt to retrieve the profile for this non-existent member
 * 3. Verify that the API returns a 404 Not Found error
 * 4. Confirm that the error is properly thrown and handled
 */
export async function test_api_member_profile_nonexistent_member(
  connection: api.IConnection,
) {
  // Generate a non-existent member ID (random UUID)
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve profile for non-existent member and expect error
  await TestValidator.error(
    "should return error when retrieving profile for non-existent member",
    async () => {
      await api.functional.discussionBoard.memberProfiles.at(connection, {
        memberId: nonExistentMemberId,
      });
    },
  );
}
