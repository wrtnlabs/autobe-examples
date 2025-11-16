import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaScore";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test karma score retrieval with a non-existent memberId to validate error
 * handling.
 *
 * This test validates that the API properly handles requests for members that
 * don't exist in the system. By using a valid UUID format but with an ID that
 * doesn't correspond to any member, we ensure the endpoint returns HTTP 404 Not
 * Found and doesn't leak information about other members.
 *
 * Test flow:
 *
 * 1. Create an authenticated member context via join endpoint
 * 2. Generate a valid UUID that doesn't correspond to any existing member
 * 3. Attempt to retrieve karma scores for the non-existent member ID
 * 4. Verify the API returns HTTP 404 Not Found error
 * 5. Confirm the error response is clear and doesn't expose system information
 */
export async function test_api_karma_score_nonexistent_member(
  connection: api.IConnection,
) {
  // Step 1: Create an authenticated member context
  const memberJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "SecurePassword123!",
    ip: "192.168.1.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const authenticatedMember = await api.functional.auth.member.join(
    connection,
    {
      body: memberJoinData,
    },
  );
  typia.assert(authenticatedMember);

  // Step 2: Generate a valid UUID that doesn't correspond to any member
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 3 & 4: Attempt to retrieve karma scores for non-existent member
  // and verify it returns HTTP 404 error
  await TestValidator.error(
    "should return 404 when retrieving karma score for non-existent member",
    async () => {
      await api.functional.communityPlatform.member.members.karmaScores.at(
        connection,
        {
          memberId: nonExistentMemberId,
        },
      );
    },
  );
}
