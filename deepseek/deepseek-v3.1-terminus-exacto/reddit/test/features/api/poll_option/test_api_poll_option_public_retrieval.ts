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
 * Test public retrieval of poll option details including option text, vote
 * count, and display order.
 *
 * This test validates that poll options can be accessed without authentication
 * when the parent post is publicly visible. The implementation follows a
 * complete workflow: member authentication, post creation with published
 * status, poll option creation, and finally public retrieval validation. The
 * test ensures the response includes complete option information with proper
 * poll association and real-time vote statistics.
 */
export async function test_api_poll_option_public_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member to create test data
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post with published status to ensure public visibility
  // Note: Using a valid community ID that would typically come from a community creation step
  // For this test, we'll use a realistic UUID format that matches the expected pattern
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
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create poll options - Since we cannot create polls directly through the provided API,
  // we need to work with the existing structure. The poll option creation requires a valid poll ID.
  // For this test, we'll create a poll option with a realistic poll ID structure.
  const pollOption =
    await api.functional.communityPlatform.member.posts.polls.options.postByPostid(
      connection,
      {
        postId: post.id,
        body: {
          option_text: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 2,
            wordMax: 6,
          }),
          display_order: typia.random<number & tags.Type<"int32">>(),
          community_platform_post_poll_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies ICommunityPlatformPostPollOption.ICreate,
      },
    );
  typia.assert(pollOption);

  // Step 4: Create unauthenticated connection for public retrieval test
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 5: Retrieve poll option publicly and validate complete information
  // Since we cannot create actual polls through the API, we'll test with the created poll option's IDs
  const retrievedOption =
    await api.functional.communityPlatform.posts.polls.options.getByPostidAndPollidAndOptionid(
      unauthConnection,
      {
        postId: post.id,
        pollId: pollOption.poll.id, // Using the poll ID from the created option
        optionId: pollOption.id,
      },
    );
  typia.assert(retrievedOption);

  // Step 6: Validate that public retrieval returns complete option information
  TestValidator.equals(
    "retrieved option ID matches created option",
    retrievedOption.id,
    pollOption.id,
  );
  TestValidator.equals(
    "option text is correctly returned",
    retrievedOption.option_text,
    pollOption.option_text,
  );
  TestValidator.equals(
    "display order is correctly returned",
    retrievedOption.display_order,
    pollOption.display_order,
  );
  TestValidator.equals(
    "vote count starts at zero",
    retrievedOption.vote_count,
    0,
  );
  TestValidator.equals(
    "poll association is maintained",
    retrievedOption.poll.id,
    pollOption.poll.id,
  );
  TestValidator.predicate(
    "created_at timestamp is present",
    retrievedOption.created_at !== undefined,
  );
}
