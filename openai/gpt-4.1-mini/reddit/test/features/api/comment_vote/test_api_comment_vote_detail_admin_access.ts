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

export async function test_api_comment_vote_detail_admin_access(
  connection: api.IConnection,
) {
  // 1. Admin user joins with a valid user_id
  // First, create a user to link to the admin
  const adminUserEmail = typia.random<string & tags.Format<"email">>();
  const adminUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: adminUserEmail,
        password: "admin_user_password",
        href: "http://localhost",
        referrer: "http://localhost",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(adminUser);

  // Now create the admin account linked to this user id
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: adminUser.id,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Switch to admin login explicitly
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminUserEmail,
      password: "admin_user_password",
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 3. Create a redditCommunity content type (e.g., 'text' type)
  const contentTypeCode = `text${RandomGenerator.alphaNumeric(4)}`;
  const contentTypeName = `TextType${RandomGenerator.alphabets(3)}`;
  const contentType: IRedditCommunityContentType =
    await api.functional.redditCommunity.admin.redditCommunityContentTypes.create(
      connection,
      {
        body: {
          content_type_code: contentTypeCode,
          content_type_name: contentTypeName,
          description: "Text content type for posts",
        } satisfies IRedditCommunityContentType.ICreate,
      },
    );
  typia.assert(contentType);

  // 4. User joins the system
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "user_password",
        href: "http://localhost",
        referrer: "http://localhost",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 5. Switch back to user login explicitly
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: "user_password",
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IRedditCommunityUser.ILogin,
  });

  // 6. User creates a new community
  const communityName = `comm_${RandomGenerator.alphaNumeric(5)}`;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: "Test community",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 7. User creates a post in that community
  const postTitle = `Title ${RandomGenerator.alphaNumeric(5)}`;
  const postBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: communityName,
        body: {
          title: postTitle,
          body: postBody,
          reddit_community_content_type_id: contentType.id,
          status: "active",
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);

  // 8. User comments on the created post
  const commentBody = RandomGenerator.paragraph({ sentences: 5 });
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: communityName,
        postId: post.id,
        body: {
          body: commentBody,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // 9. User creates a vote on the comment - an upvote
  const commentVote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.user.communities.comments.votes.create(
      connection,
      {
        communityName: communityName,
        commentId: comment.id,
        body: {
          reddit_community_comment_id: comment.id,
          vote_type: "upvote",
        } satisfies IRedditCommunityCommentVote.ICreate,
      },
    );
  typia.assert(commentVote);

  // 10. Switch back to admin login to retrieve the comment vote details
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminUserEmail,
      password: "admin_user_password",
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 11. Admin retrieves the detailed info of the comment vote
  const retrievedVote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.admin.communities.comments.votes.at(
      connection,
      {
        communityName: communityName,
        commentId: comment.id,
        voteId: commentVote.id,
      },
    );
  typia.assert(retrievedVote);

  // 12. Validate the retrieved vote matches the created vote
  TestValidator.equals(
    "vote ids should match",
    retrievedVote.id,
    commentVote.id,
  );
  TestValidator.equals(
    "vote type should match",
    retrievedVote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "comment ids should match",
    retrievedVote.reddit_community_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "community ids should match",
    retrievedVote.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals(
    "user ids should match",
    retrievedVote.reddit_community_user_id,
    user.id,
  );
}
