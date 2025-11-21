import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Test that administrators can update vote records on posts.
 *
 * This scenario validates administrative vote management capabilities where an
 * administrator modifies vote details such as vote type or weight. A member
 * creates a post and casts a vote, then an administrator updates the vote
 * record with new information. The test verifies that vote updates are properly
 * applied and reflected in the system, including changes to vote direction and
 * weight calculations.
 */
export async function test_api_admin_vote_update_by_post(
  connection: api.IConnection,
) {
  // Step 1: Create member account for post creation context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "Password123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create post that will receive votes
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Cast initial vote that will be updated
  const initialVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
          actor_type: "member",
          content_type: "post",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(initialVote);

  // Step 4: Create administrator account for vote update authorization
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 5: Switch to administrator authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "test-agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 6: Update the vote record with new vote type and weight
  const updatedVote =
    await api.functional.communityPlatform.admin.posts.votes.update(
      connection,
      {
        postId: post.id,
        voteId: initialVote.id,
        body: {
          vote_type: "downvote",
          vote_weight: 2,
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(updatedVote);

  // Step 7: Verify the vote update was successful
  TestValidator.equals(
    "vote type should be updated to downvote",
    updatedVote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "vote weight should be updated to 2",
    updatedVote.vote_weight,
    2,
  );
  TestValidator.equals(
    "post ID should remain the same",
    updatedVote.post?.id,
    post.id,
  );
  TestValidator.equals(
    "vote ID should remain the same",
    updatedVote.id,
    initialVote.id,
  );
}
