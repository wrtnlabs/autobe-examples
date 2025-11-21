import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostPoll";
import type { ICommunityPlatformPostPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostPollOption";

/**
 * Test retrieval of poll options with accurate vote count tracking.
 *
 * This E2E test validates that poll options display correct vote counts
 * reflecting user voting activity. The scenario covers option creation and
 * subsequent retrieval, ensuring that vote counts are properly maintained and
 * displayed in poll option responses.
 *
 * Steps:
 *
 * 1. Create authenticated member account for post and option creation
 * 2. Create a poll-type post that will contain the poll
 * 3. Create poll options that will be retrieved with vote count
 * 4. Retrieve poll options and validate vote count accuracy
 * 5. Verify that vote counts are properly maintained at zero initially
 */
export async function test_api_poll_option_retrieval_with_vote_count(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a poll-type post
  // Note: The community ID must be a valid UUID that exists in the system
  // For testing purposes, we'll use a realistic UUID format
  const communityId = typia.random<string & tags.Format<"uuid">>();

  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        post_type: "poll",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create poll options
  // Note: The poll ID must reference an existing poll associated with the post
  // For testing purposes, we'll use a realistic UUID format
  const pollId = typia.random<string & tags.Format<"uuid">>();

  const pollOptionData = {
    option_text: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 2,
      wordMax: 6,
    }),
    display_order: 1,
    community_platform_post_poll_id: pollId,
  } satisfies ICommunityPlatformPostPollOption.ICreate;

  const pollOption =
    await api.functional.communityPlatform.member.posts.polls.options.postByPostidAndPollid(
      connection,
      {
        postId: post.id,
        pollId: pollId,
        body: pollOptionData,
      },
    );
  typia.assert(pollOption);

  // Step 4: Retrieve poll option and validate vote count
  const retrievedOption =
    await api.functional.communityPlatform.posts.polls.options.getByPostidAndOptionid(
      connection,
      {
        postId: post.id,
        optionId: pollOption.id,
      },
    );
  typia.assert(retrievedOption);

  // Step 5: Validate vote count accuracy
  TestValidator.equals(
    "retrieved option vote count should be zero initially",
    retrievedOption.vote_count,
    0,
  );
  TestValidator.equals(
    "retrieved option text should match created option",
    retrievedOption.option_text,
    pollOptionData.option_text,
  );
  TestValidator.equals(
    "retrieved option display order should match created option",
    retrievedOption.display_order,
    pollOptionData.display_order,
  );
  TestValidator.equals(
    "retrieved option ID should match created option ID",
    retrievedOption.id,
    pollOption.id,
  );
}
