import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Test updating a vote on a post, validating the voting system's ability to
 * change vote type.
 *
 * This test scenario validates that the voting system correctly handles vote
 * updates, including changing vote type from upvote to downvote and verifying
 * that the updated_at timestamp is properly recorded. The workflow involves
 * creating a member, category, community, post, then voting and updating that
 * vote to verify proper state management and timestamp tracking.
 *
 * Process:
 *
 * 1. Create administrator account for category creation
 * 2. Create category for community classification
 * 3. Create member account for content creation and voting
 * 4. Create community for organizing content
 * 5. Create post as content for voting
 * 6. Cast initial upvote on the post
 * 7. Update vote from upvote to downvote
 * 8. Verify vote_type is updated correctly
 * 9. Verify updated_at timestamp reflects the modification
 * 10. Confirm vote maintains correct content references
 */
export async function test_api_vote_update_on_comment(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123",
        username: RandomGenerator.alphabets(12),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/categories",
        referrer: "http://localhost:3000/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology and programming discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account for content creation and voting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "MemberPassword123",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Create community for organizing content
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "TypeScript Discussion",
          identifier: `ts_${RandomGenerator.alphaNumeric(6)}`,
          description: "Discuss TypeScript best practices",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create post as content for voting
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Best practices for TypeScript",
        content_text: "Let's discuss TypeScript best practices and patterns",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 6. Cast initial upvote on the post
  const initialVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(initialVote);
  TestValidator.equals(
    "initial vote type should be upvote",
    initialVote.vote_type,
    "upvote",
  );

  // 7. Update vote from upvote to downvote
  const updatedVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.update(connection, {
      voteId: initialVote.id,
      body: {
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.IUpdate,
    });
  typia.assert(updatedVote);

  // 8. Verify vote_type is updated correctly
  TestValidator.equals(
    "updated vote type should be downvote",
    updatedVote.vote_type,
    "downvote",
  );

  // 9. Verify updated_at timestamp reflects the modification
  TestValidator.predicate(
    "updated_at should be set and be a valid date-time",
    updatedVote.updated_at !== null && updatedVote.updated_at !== undefined,
  );

  // 10. Confirm vote maintains correct content references
  TestValidator.equals(
    "vote should reference correct content",
    updatedVote.content_id,
    post.id,
  );
  TestValidator.equals(
    "vote content type should be post",
    updatedVote.content_type,
    "post",
  );
}
