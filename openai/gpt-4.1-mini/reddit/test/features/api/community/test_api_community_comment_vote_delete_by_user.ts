import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentType";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_community_comment_vote_delete_by_user(
  connection: api.IConnection,
) {
  // 1. User authenticate via /auth/user/join
  const userAuth: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(5) + "@example.com",
        password: "password123",
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(userAuth);

  // 2. Admin authenticate via /auth/admin/join (to create content type)
  const adminAuth: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: userAuth.id,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 3. Create content type 'text'
  const contentTypeRequestBody = {
    content_type_code: "text",
    content_type_name: "Text",
    description: "Text content type for posts",
  } satisfies IRedditCommunityContentType.ICreate;
  const contentType: IRedditCommunityContentType =
    await api.functional.redditCommunity.admin.redditCommunityContentTypes.create(
      connection,
      {
        body: contentTypeRequestBody,
      },
    );
  typia.assert(contentType);

  // 4. Create a community
  const communityCreateBody = {
    name: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // 5. Create a post in the community
  const postCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    reddit_community_content_type_id: contentType.id,
    status: "active",
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 6. Add a comment to the post
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditCommunityComment.ICreate;

  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 7. Create a vote on the comment
  const voteCreateBody = {
    reddit_community_comment_id: comment.id,
    vote_type: "upvote",
  } satisfies IRedditCommunityCommentVote.ICreate;

  const vote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.user.communities.comments.votes.create(
      connection,
      {
        communityName: community.name,
        commentId: comment.id,
        body: voteCreateBody,
      },
    );
  typia.assert(vote);

  // 8. Delete the vote by voteId
  await api.functional.redditCommunity.user.communities.comments.votes.erase(
    connection,
    {
      communityName: community.name,
      commentId: comment.id,
      voteId: vote.id,
    },
  );

  // 9. Verify deletion by attempting to delete again should error
  await TestValidator.error(
    "Deleting already deleted vote should fail",
    async () => {
      await api.functional.redditCommunity.user.communities.comments.votes.erase(
        connection,
        {
          communityName: community.name,
          commentId: comment.id,
          voteId: vote.id,
        },
      );
    },
  );
}
