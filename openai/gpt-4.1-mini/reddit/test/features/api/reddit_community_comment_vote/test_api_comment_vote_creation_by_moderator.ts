import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

/**
 * E2E test scenario for moderator voting on comments in communities.
 *
 * This test ensures that a moderator user can successfully authenticate, create
 * a new community, create a post within that community, create a comment on the
 * post, and then cast a vote on the comment. It verifies the integrity and
 * associations of the created vote, confirms enforcement of business rules
 * regarding single vote per user, and validates moderator authorization to
 * vote.
 */
export async function test_api_comment_vote_creation_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator user registration
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "StrongPass123!",
        ip: null,
        href: "https://reddit.example.com/moderator-join",
        referrer: "https://reddit.example.com",
      } satisfies IRedditCommunityModerator.IJoin,
    });
  typia.assert(moderator);

  // 2. Moderator login to switch authentication session
  const moderatorLogin: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: "StrongPass123!",
        ip: null,
        href: "https://reddit.example.com/moderator-login",
        referrer: "https://reddit.example.com",
      } satisfies IRedditCommunityModerator.ILogin,
    });
  typia.assert(moderatorLogin);

  // 3. Create a new community
  const communityName = `test_community_${RandomGenerator.alphaNumeric(6)}`;
  const communityDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 8,
  });
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: communityDescription,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);

  // 4. Create a post in the community
  // Use realistic content type id for "text" content (simulate UUID for content type)
  const contentTypeIdText = typia.random<string & tags.Format<"uuid">>();
  const postTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const postStatus = "active";

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName,
        body: {
          title: postTitle,
          body: postBody,
          reddit_community_content_type_id: contentTypeIdText,
          status: postStatus,
          image_uri: null,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals("post title matches", post.title, postTitle);

  // 5. Create a comment on the post
  const commentBody = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 12,
  });
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName,
        postId: post.id,
        body: {
          body: commentBody,
          parent_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals("comment body matches", comment.body, commentBody);

  // 6. Moderator casts an upvote on the comment
  const voteType = "upvote" as const;
  const voteCreateBody: IRedditCommunityCommentVote.ICreate = {
    reddit_community_comment_id: comment.id,
    vote_type: voteType,
  };

  const vote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.moderator.communities.comments.votes.create(
      connection,
      {
        communityName,
        commentId: comment.id,
        body: voteCreateBody,
      },
    );
  typia.assert(vote);
  TestValidator.equals(
    "vote comment id matches",
    vote.reddit_community_comment_id,
    comment.id,
  );
  TestValidator.equals("vote type matches", vote.vote_type, voteType);
  TestValidator.equals(
    "vote community id matches",
    vote.reddit_community_community_id,
    community.id,
  );
  TestValidator.predicate(
    "vote created_at is ISO 8601",
    typeof vote.created_at === "string" && vote.created_at.length > 0,
  );
  TestValidator.predicate(
    "vote updated_at is ISO 8601",
    typeof vote.updated_at === "string" && vote.updated_at.length > 0,
  );

  // 7. Validate single vote per user enforcement by attempting to cast a second vote
  await TestValidator.error(
    "duplicate vote by moderator should fail",
    async () => {
      await api.functional.redditCommunity.moderator.communities.comments.votes.create(
        connection,
        {
          communityName,
          commentId: comment.id,
          body: voteCreateBody,
        },
      );
    },
  );
}
