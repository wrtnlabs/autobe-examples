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
 * Test successful creation of a new voting option for an existing poll within a
 * member's post.
 *
 * This E2E test validates that authenticated members can add voting options to
 * polls they own, ensuring proper option text, display order, and poll
 * association. The test follows a complete workflow from member authentication
 * through post creation, poll setup, and option creation.
 *
 * Steps:
 *
 * 1. Create member account for authentication
 * 2. Create a post to host the poll
 * 3. Create initial poll options to establish poll context
 * 4. Create additional voting options using the target API endpoint
 * 5. Validate response includes complete poll option object with system-generated
 *    fields
 */
export async function test_api_poll_option_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
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

  // Step 2: Create a post to host the poll
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

  // Step 3: Create initial poll options to establish poll context
  const initialOption =
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
  typia.assert(initialOption);

  // Step 4: Create additional voting options using the target API endpoint
  // Use the poll ID from the created option's poll reference
  const pollId = initialOption.poll.id;
  const newOption =
    await api.functional.communityPlatform.member.posts.polls.options.postByPostidAndPollid(
      connection,
      {
        postId: post.id,
        pollId: pollId,
        body: {
          option_text: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 2,
          community_platform_post_poll_id: pollId,
        } satisfies ICommunityPlatformPostPollOption.ICreate,
      },
    );
  typia.assert(newOption);

  // Step 5: Validate response includes complete poll option object
  TestValidator.equals(
    "option text matches input",
    newOption.option_text,
    newOption.option_text,
  );
  TestValidator.equals(
    "display order matches input",
    newOption.display_order,
    2,
  );
  TestValidator.equals("vote count starts at zero", newOption.vote_count, 0);
  TestValidator.predicate(
    "ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      newOption.id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/.test(newOption.created_at),
  );

  // Validate poll reference structure
  TestValidator.equals("poll ID matches input", newOption.poll.id, pollId);
  TestValidator.predicate(
    "poll question exists",
    newOption.poll.question.length > 0,
  );
  TestValidator.predicate(
    "poll duration is positive",
    newOption.poll.duration_days > 0,
  );
  TestValidator.predicate(
    "poll max votes is positive",
    newOption.poll.max_votes_per_user > 0,
  );
  TestValidator.predicate(
    "poll total votes is non-negative",
    newOption.poll.total_votes >= 0,
  );
  TestValidator.predicate(
    "poll expiration date is valid",
    /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/.test(
      newOption.poll.expires_at,
    ),
  );
  TestValidator.predicate(
    "poll creation date is valid",
    /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/.test(
      newOption.poll.created_at,
    ),
  );
}
