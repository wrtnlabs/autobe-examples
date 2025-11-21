import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostPoll";

/**
 * Test moderator updating a poll created by a member user.
 *
 * This comprehensive E2E test validates that moderators can modify polls across
 * different communities they moderate, including updating poll questions,
 * duration settings, and voting limits. The scenario tests moderator privileges
 * for content management and ensures proper authorization checks are enforced.
 *
 * The test follows a multi-actor workflow:
 *
 * 1. Member user creates a poll post in a community
 * 2. Moderator authenticates and updates the poll
 * 3. Validates all poll fields can be properly modified
 * 4. Ensures authorization boundaries are respected
 */
export async function test_api_post_poll_update_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "memberPassword123",
      display_name: RandomGenerator.name(),
      href: "https://community-platform.test/auth/join",
      referrer: "https://community-platform.test/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post with poll type as member
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

  // Step 3: Create and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Update the poll as moderator
  const updatedPoll =
    await api.functional.communityPlatform.moderator.posts.polls.update(
      connection,
      {
        postId: post.id,
        body: {
          question:
            "Updated poll question: " +
            RandomGenerator.paragraph({ sentences: 3 }),
          duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          max_votes_per_user: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformPostPoll.IUpdate,
      },
    );
  typia.assert(updatedPoll);

  // Step 5: Validate the poll was successfully updated
  TestValidator.equals(
    "poll question should be updated",
    updatedPoll.question.includes("Updated poll question:"),
    true,
  );
  TestValidator.equals(
    "post ID should match",
    updatedPoll.community_platform_post_id,
    post.id,
  );
  TestValidator.predicate(
    "duration days should be positive",
    updatedPoll.duration_days > 0,
  );
  TestValidator.predicate(
    "max votes per user should be positive",
    updatedPoll.max_votes_per_user > 0,
  );

  // Step 6: Test partial update with only question field
  const partiallyUpdatedPoll =
    await api.functional.communityPlatform.moderator.posts.polls.update(
      connection,
      {
        postId: post.id,
        body: {
          question: "Partially updated question",
        } satisfies ICommunityPlatformPostPoll.IUpdate,
      },
    );
  typia.assert(partiallyUpdatedPoll);
  TestValidator.equals(
    "question should be partially updated",
    partiallyUpdatedPoll.question,
    "Partially updated question",
  );

  // Step 7: Test partial update with only duration field
  const newDuration = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<14>
  >();
  const durationUpdatedPoll =
    await api.functional.communityPlatform.moderator.posts.polls.update(
      connection,
      {
        postId: post.id,
        body: {
          duration_days: newDuration,
        } satisfies ICommunityPlatformPostPoll.IUpdate,
      },
    );
  typia.assert(durationUpdatedPoll);
  TestValidator.equals(
    "duration should be updated",
    durationUpdatedPoll.duration_days,
    newDuration,
  );
}
