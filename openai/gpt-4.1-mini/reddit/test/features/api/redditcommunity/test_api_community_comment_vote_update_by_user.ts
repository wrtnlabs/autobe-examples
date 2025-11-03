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

export async function test_api_community_comment_vote_update_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        href: "https://reddit.example.com/signup",
        referrer: "https://example.com",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // Save the user authorization token is handled by SDK internally

  // 2. Authenticate as an admin
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: user.id, // Associate the admin to the user for test
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 3. Create a content type 'text'
  const contentType: IRedditCommunityContentType =
    await api.functional.redditCommunity.admin.redditCommunityContentTypes.create(
      connection,
      {
        body: {
          content_type_code: "text",
          content_type_name: "Text",
          description: "Text content type",
        } satisfies IRedditCommunityContentType.ICreate,
      },
    );
  typia.assert(contentType);

  // 4. Create a community
  const communityName = `test-community-${RandomGenerator.alphaNumeric(5)}`;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: "A test community created for e2e test",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);

  // 5. Create a post in the community with the text content type
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "Test Post",
          body: "This is a test post body",
          reddit_community_content_type_id: contentType.id,
          status: "active",
          image_uri: null,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community id matches",
    post.reddit_community_community_id,
    community.id,
  );

  // 6. Add a comment to the post
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        body: {
          body: "Test comment",
          parent_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment post id matches",
    comment.reddit_community_post_id,
    post.id,
  );

  // 7. Create a vote on the comment by the user
  const voteCreateBody = {
    reddit_community_comment_id: comment.id,
    vote_type: "upvote" as "upvote" | "downvote",
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
  TestValidator.equals(
    "vote comment id matches",
    vote.reddit_community_comment_id,
    comment.id,
  );
  TestValidator.equals("vote type is upvote", vote.vote_type, "upvote");

  // 8. Update the vote with a valid vote_type value (downvote)
  const voteUpdateBody = {
    vote_type: "downvote",
  } satisfies IRedditCommunityCommentVote.IUpdate;

  const updatedVote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.user.communities.comments.votes.update(
      connection,
      {
        communityName: community.name,
        commentId: comment.id,
        voteId: vote.id,
        body: voteUpdateBody,
      },
    );
  typia.assert(updatedVote);
  TestValidator.equals("updated vote id matches", updatedVote.id, vote.id);
  TestValidator.equals(
    "updated vote type is downvote",
    updatedVote.vote_type,
    "downvote",
  );
}
