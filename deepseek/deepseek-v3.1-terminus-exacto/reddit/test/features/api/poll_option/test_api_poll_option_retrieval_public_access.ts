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
 * Test public retrieval of poll options from published posts.
 *
 * This E2E test validates that poll options can be accessed without
 * authentication when the parent post is publicly visible. The scenario covers
 * option creation by authenticated members followed by public retrieval,
 * ensuring that voting options are properly accessible to all users regardless
 * of authentication status.
 *
 * The test demonstrates the platform's commitment to public content
 * accessibility while maintaining proper data integrity and relationship
 * validation.
 */
export async function test_api_poll_option_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account for post and poll option creation
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

  // Step 2: Create a published post that will contain the poll
  // Note: Since we don't have community creation API, we generate a valid UUID
  // This assumes the test environment has communities or the API allows any UUID
  const communityId = typia.random<string & tags.Format<"uuid">>();

  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "poll",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create poll option that will be retrieved publicly
  // Note: Since we don't have poll creation API, we generate a valid UUID
  // This assumes the poll exists or the API allows option creation with any poll ID
  const pollId = typia.random<string & tags.Format<"uuid">>();

  const pollOption =
    await api.functional.communityPlatform.member.posts.polls.options.postByPostidAndPollid(
      connection,
      {
        postId: post.id,
        pollId: pollId,
        body: {
          option_text: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
          community_platform_post_poll_id: pollId,
        } satisfies ICommunityPlatformPostPollOption.ICreate,
      },
    );
  typia.assert(pollOption);

  // Step 4: Test public retrieval without authentication
  // Create unauthenticated connection by clearing headers
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  const retrievedOption =
    await api.functional.communityPlatform.posts.polls.options.getByPostidAndOptionid(
      publicConnection,
      {
        postId: post.id,
        optionId: pollOption.id,
      },
    );
  typia.assert(retrievedOption);

  // Step 5: Validate that retrieved option matches created option
  TestValidator.equals(
    "option text should match",
    retrievedOption.option_text,
    pollOption.option_text,
  );
  TestValidator.equals(
    "display order should match",
    retrievedOption.display_order,
    pollOption.display_order,
  );
  TestValidator.equals(
    "vote count should be zero",
    retrievedOption.vote_count,
    0,
  );
  TestValidator.equals("poll ID should match", retrievedOption.poll.id, pollId);
  TestValidator.equals(
    "created at should match",
    retrievedOption.created_at,
    pollOption.created_at,
  );
}
