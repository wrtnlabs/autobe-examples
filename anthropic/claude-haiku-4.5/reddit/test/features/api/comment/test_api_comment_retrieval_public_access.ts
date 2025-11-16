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

export async function test_api_comment_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create a member and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a public community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
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
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Create a top-level comment on the post
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // Step 7: Switch to unauthenticated connection to test public access
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 8: Retrieve the comment without authentication
  const retrievedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.comments.at(unauthConn, {
      commentId: comment.id,
    });
  typia.assert(retrievedComment);

  // Step 9: Validate comment data is complete and correct
  TestValidator.equals(
    "retrieved comment ID matches created comment",
    retrievedComment.id,
    comment.id,
  );

  TestValidator.equals(
    "retrieved comment content matches",
    retrievedComment.content,
    comment.content,
  );

  TestValidator.predicate(
    "comment has creator information",
    retrievedComment.creator !== null && retrievedComment.creator !== undefined,
  );

  TestValidator.predicate(
    "comment has post information",
    retrievedComment.post !== null && retrievedComment.post !== undefined,
  );

  TestValidator.equals(
    "comment post ID matches",
    retrievedComment.post.id,
    post.id,
  );

  TestValidator.predicate(
    "comment vote count is non-negative",
    retrievedComment.vote_score >= 0,
  );

  TestValidator.predicate(
    "comment upvote count is non-negative",
    retrievedComment.upvote_count >= 0,
  );

  TestValidator.predicate(
    "comment downvote count is non-negative",
    retrievedComment.downvote_count >= 0,
  );

  TestValidator.equals(
    "comment visibility is visible",
    retrievedComment.visibility_status,
    "visible",
  );

  TestValidator.predicate(
    "comment has creation timestamp",
    retrievedComment.created_at !== null &&
      retrievedComment.created_at !== undefined,
  );

  TestValidator.predicate(
    "comment nesting depth is zero for top-level",
    retrievedComment.nesting_depth === 0,
  );
}
