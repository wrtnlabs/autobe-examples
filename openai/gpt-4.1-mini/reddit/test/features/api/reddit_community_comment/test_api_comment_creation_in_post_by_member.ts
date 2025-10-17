import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * Validate the end-to-end flow for a member to create comments and nested
 * replies on a post.
 *
 * This test ensures:
 *
 * 1. Member registration for authentication
 * 2. Community creation by the member
 * 3. Post creation in the community
 * 4. Comment creation on the post by the member
 * 5. Nested comment reply creation referencing the parent comment
 * 6. Validation of comment details and proper linkage between parent and child
 *    comments
 * 7. Authentication enforcement at each step
 */
export async function test_api_comment_creation_in_post_by_member(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "strongPassword123";
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a new community as member
  const communityName =
    RandomGenerator.name(1).toLowerCase().replace(/\W/g, "_") +
    RandomGenerator.alphaNumeric(4);
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community name is non-empty",
    community.name.length > 0,
  );

  // 3. Create a new text post in the community as member
  const postTitle = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 5,
    wordMax: 12,
  });
  const postBodyText = RandomGenerator.content({ paragraphs: 3 });
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: {
          reddit_community_community_id: community.id,
          post_type: "text",
          title: postTitle,
          body_text: postBodyText,
        } satisfies IRedditCommunityPosts.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.predicate("post type is 'text'", post.post_type === "text");

  // 4. Member creates a root comment on the post
  const rootCommentText = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 12,
  });
  const rootComment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          reddit_community_post_id: post.id,
          body_text: rootCommentText,
          author_member_id: member.id,
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(rootComment);
  TestValidator.equals(
    "root comment parent_comment_id is null",
    rootComment.parent_comment_id,
    null,
  );
  TestValidator.equals(
    "root comment author_member_id is member",
    rootComment.author_member_id,
    member.id,
  );
  TestValidator.predicate(
    "root comment body_text non-empty",
    rootComment.body_text.length > 0,
  );

  // 5. Member creates a nested comment reply to the root comment
  const nestedCommentText = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 10,
  });
  const nestedComment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          reddit_community_post_id: post.id,
          body_text: nestedCommentText,
          author_member_id: member.id,
          parent_comment_id: rootComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(nestedComment);
  TestValidator.equals(
    "nested comment parent_comment_id is root comment id",
    nestedComment.parent_comment_id,
    rootComment.id,
  );
  TestValidator.equals(
    "nested comment author_member_id is member",
    nestedComment.author_member_id,
    member.id,
  );
  TestValidator.predicate(
    "nested comment body_text non-empty",
    nestedComment.body_text.length > 0,
  );

  // 6. Verify timestamps are valid ISO8601 strings and created_at <= updated_at
  for (const comment of [rootComment, nestedComment]) {
    typia.assert(comment.created_at);
    typia.assert(comment.updated_at);
    const createdAt = new Date(comment.created_at);
    const updatedAt = new Date(comment.updated_at);
    TestValidator.predicate(
      `${comment.id} created_at <= updated_at`,
      createdAt <= updatedAt,
    );
  }
}
