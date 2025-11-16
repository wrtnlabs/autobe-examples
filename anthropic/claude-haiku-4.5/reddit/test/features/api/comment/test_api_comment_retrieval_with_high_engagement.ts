import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_comment_retrieval_with_high_engagement(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create a member account for community and post creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Create a comment on the post
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // Step 7: Retrieve the comment and validate vote engagement metrics
  const retrievedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.comments.at(connection, {
      commentId: comment.id,
    });
  typia.assert(retrievedComment);

  // Validate vote score calculation: vote_score = upvote_count - downvote_count
  TestValidator.equals(
    "vote score should equal upvote_count minus downvote_count",
    retrievedComment.vote_score,
    retrievedComment.upvote_count - retrievedComment.downvote_count,
  );

  // Validate initial vote counts are zero for newly created comment
  TestValidator.equals(
    "initial upvote_count should be zero",
    retrievedComment.upvote_count,
    0,
  );

  TestValidator.equals(
    "initial downvote_count should be zero",
    retrievedComment.downvote_count,
    0,
  );

  TestValidator.equals(
    "initial vote_score should be zero",
    retrievedComment.vote_score,
    0,
  );

  // Validate comment content and metadata
  TestValidator.equals(
    "retrieved comment id should match created comment id",
    retrievedComment.id,
    comment.id,
  );

  TestValidator.equals(
    "retrieved comment content should match created comment content",
    retrievedComment.content,
    comment.content,
  );

  // Validate visibility status is set to visible by default
  TestValidator.equals(
    "comment visibility_status should be visible",
    retrievedComment.visibility_status,
    "visible",
  );

  // Validate nesting depth for top-level comment
  TestValidator.equals(
    "top-level comment nesting_depth should be zero",
    retrievedComment.nesting_depth,
    0,
  );

  // Validate comment is not locked by default
  TestValidator.equals(
    "comment is_locked should be false by default",
    retrievedComment.is_locked,
    false,
  );
}
