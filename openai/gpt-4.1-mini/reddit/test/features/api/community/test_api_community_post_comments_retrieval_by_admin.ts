import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

/**
 * Test retrieval of a paginated list of comments for a specific post within a
 * community by an admin.
 *
 * This test performs the following steps:
 *
 * 1. Create a normal user and authenticate.
 * 2. Create an admin user linked to the created user.
 * 3. Create a community hosted by the user.
 * 4. Create a new post within that community.
 * 5. As the authenticated admin, retrieve paginated comments for the post.
 * 6. Validate the pagination information and the returned comments.
 *
 * This ensures that admin-level comment retrieval for a community post works
 * correctly, with proper authentication, resource creation, and response
 * validation.
 *
 * @param connection The API connection to use for calls.
 */
export async function test_api_community_post_comments_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as normal user
  const userPayload: IRedditCommunityUser.ICreate = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "StrongPass123!",
    href: "https://example.com/user-page",
    referrer: "https://example.com/referrer",
  };
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userPayload });
  typia.assert(user);

  // 2. Authenticate as admin linked to the user
  const adminPayload: IRedditCommunityAdmin.ICreate = {
    user_id: user.id,
  };
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminPayload });
  typia.assert(admin);

  // 3. Create community
  const communityName: string = `test_community_${RandomGenerator.alphaNumeric(
    6,
  )}`;
  const communityBody: IRedditCommunityCommunity.ICreate = {
    name: communityName,
    description: "Test community for comment retrieval by admin",
  };
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 4. Create post
  const postBody: IRedditCommunityPost.ICreate = {
    title: "Test Post for Comments",
    body: "This is a test post body",
    reddit_community_content_type_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    status: "active",
    image_uri: null,
  };
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: communityName,
        body: postBody,
      },
    );
  typia.assert(post);

  // 5. Retrieve post comments as admin
  const requestBody: IRedditCommunityComment.IRequest = {
    page: 1,
    limit: 10,
  };
  const commentsPage: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.admin.communities.posts.comments.index(
      connection,
      {
        communityName: communityName,
        postId: post.id,
        body: requestBody,
      },
    );
  typia.assert(commentsPage);

  // 6. Validate pagination
  TestValidator.predicate(
    "pagination current page is valid",
    commentsPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "comments data is array",
    Array.isArray(commentsPage.data),
  );
  for (const comment of commentsPage.data) {
    typia.assert(comment);
    TestValidator.equals("comment post_id matches", comment.post_id, post.id);
    TestValidator.predicate(
      "comment id is uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        comment.id,
      ),
    );
    TestValidator.predicate(
      "comment body is string",
      typeof comment.body === "string",
    );
  }
}
