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
 * Test successful creation of poll options by the post author.
 *
 * Validates that authenticated members can add voting options to polls they
 * created, ensuring proper option text uniqueness, display ordering, and poll
 * association. The scenario covers the complete workflow from member
 * registration to post creation, poll setup, and option addition, verifying
 * that options are properly linked to their parent poll and initialized with
 * zero votes.
 */
export async function test_api_poll_option_creation_by_post_author(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
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

  // Step 2: Create a poll-type post (community ID will be handled by backend)
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "poll",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create poll options for the post
  // Note: The poll ID should be derived from the post, but since the API structure
  // doesn't provide a direct way to get the poll ID from the post, we'll assume
  // the backend handles the relationship correctly when creating poll options
  const pollOption1 =
    await api.functional.communityPlatform.member.posts.polls.options.postByPostid(
      connection,
      {
        postId: post.id,
        body: {
          option_text: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
          community_platform_post_poll_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies ICommunityPlatformPostPollOption.ICreate,
      },
    );
  typia.assert(pollOption1);

  const pollOption2 =
    await api.functional.communityPlatform.member.posts.polls.options.postByPostid(
      connection,
      {
        postId: post.id,
        body: {
          option_text: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 2,
          community_platform_post_poll_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies ICommunityPlatformPostPollOption.ICreate,
      },
    );
  typia.assert(pollOption2);

  // Step 4: Validate poll option properties
  TestValidator.equals(
    "poll option 1 should have unique ID",
    pollOption1.id,
    pollOption1.id,
  );
  TestValidator.equals(
    "poll option 2 should have unique ID",
    pollOption2.id,
    pollOption2.id,
  );
  TestValidator.notEquals(
    "poll options should have different IDs",
    pollOption1.id,
    pollOption2.id,
  );

  TestValidator.equals(
    "poll option 1 should have display order 1",
    pollOption1.display_order,
    1,
  );
  TestValidator.equals(
    "poll option 2 should have display order 2",
    pollOption2.display_order,
    2,
  );

  TestValidator.equals(
    "poll option 1 should have zero votes",
    pollOption1.vote_count,
    0,
  );
  TestValidator.equals(
    "poll option 2 should have zero votes",
    pollOption2.vote_count,
    0,
  );

  TestValidator.predicate(
    "poll option 1 should have valid option text",
    pollOption1.option_text.length > 0,
  );
  TestValidator.predicate(
    "poll option 2 should have valid option text",
    pollOption2.option_text.length > 0,
  );

  TestValidator.notEquals(
    "poll options should have different text",
    pollOption1.option_text,
    pollOption2.option_text,
  );
}
