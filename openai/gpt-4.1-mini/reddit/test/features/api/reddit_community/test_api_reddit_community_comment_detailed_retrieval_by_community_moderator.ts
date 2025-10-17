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

export async function test_api_reddit_community_comment_detailed_retrieval_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Register new community moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: {
          email: moderatorEmail,
          password: "StrongPass123!",
        } satisfies IRedditCommunityCommunityModerator.IJoin,
      },
    );
  typia.assert(moderator);

  // 2. Register member user for comment author
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "StrongPass123!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 3. Community moderator creates a community
  const communityBody = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 })
      .replace(/\s/g, "_")
      .toLowerCase(),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;

  // Use the community moderator connection (authorization is handled internally)
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 4. Community moderator creates a post in the community (post type text)
  const postBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    body_text: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityPosts.ICreate;

  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);

  // 5. Member creates a comment on the post
  const commentBody = {
    reddit_community_post_id: post.id,
    body_text: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    author_member_id: member.id,
  } satisfies IRedditCommunityComment.ICreate;

  // Switch to member authentication context
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "StrongPass123!",
    } satisfies IRedditCommunityMember.ICreate,
  });

  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 6. Switch back to community moderator context for comment detail retrieval
  await api.functional.auth.communityModerator.join.joinCommunityModerator(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "StrongPass123!",
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );

  // 7. Community moderator retrieves detailed comment info
  const retrievedComment: IRedditCommunityComment =
    await api.functional.redditCommunity.communityModerator.posts.comments.at(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    );
  typia.assert(retrievedComment);

  // 8. Validate retrieved comment matches created comment
  TestValidator.equals(
    "comment id should match",
    retrievedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment post id should match",
    retrievedComment.reddit_community_post_id,
    comment.reddit_community_post_id,
  );
  TestValidator.equals(
    "comment body text should match",
    retrievedComment.body_text,
    comment.body_text,
  );
  TestValidator.equals(
    "comment author member id should match",
    retrievedComment.author_member_id,
    comment.author_member_id,
  );
  TestValidator.equals(
    "comment created_at should match",
    retrievedComment.created_at,
    comment.created_at,
  );
  TestValidator.equals(
    "comment updated_at should match",
    retrievedComment.updated_at,
    comment.updated_at,
  );
}
