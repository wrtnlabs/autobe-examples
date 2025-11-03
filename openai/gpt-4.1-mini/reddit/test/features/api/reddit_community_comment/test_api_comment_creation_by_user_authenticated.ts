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

export async function test_api_comment_creation_by_user_authenticated(
  connection: api.IConnection,
) {
  // 1. Create normal user who will write the comment
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "123456",
        href: "https://example.com/",
        referrer: "https://referrer.example.com/",
        ip: null,
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 2. Login normal user to authenticate
  const loggedInUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: userEmail,
        password: "123456",
        href: "https://example.com/",
        referrer: "https://referrer.example.com/",
        ip: null,
      } satisfies IRedditCommunityUser.ILogin,
    });
  typia.assert(loggedInUser);

  // 3. Create another user for admin
  const userAdminEmail = typia.random<string & tags.Format<"email">>();
  const userAdmin: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userAdminEmail,
        password: "123456",
        href: "https://example.com/",
        referrer: "https://referrer.example.com/",
        ip: null,
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(userAdmin);

  // 4. Create admin actor using userAdmin's user_id
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: userAdmin.id,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 5. Login admin user to authenticate
  const loggedInAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: userAdminEmail,
        password: "123456",
        href: "https://example.com/",
        referrer: "https://referrer.example.com/",
        ip: null,
      } satisfies IRedditCommunityAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 6. Admin creates content type
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

  // Switch back to normal user for community creation
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: "123456",
      href: "https://example.com/",
      referrer: "https://referrer.example.com/",
      ip: null,
    } satisfies IRedditCommunityUser.ILogin,
  });

  // 7. Normal user creates a community
  const communityName = RandomGenerator.alphaNumeric(8);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: "Test community for comment creation",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 8. Normal user creates a post
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: communityName,
        body: {
          title: "Test Post Title",
          body: "This is a test post body.",
          image_uri: null,
          reddit_community_content_type_id: contentType.id,
          status: "active",
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);

  // 9. Normal user creates a comment on the post
  const commentBody = {
    body: "This is a test comment.",
    parent_id: null,
  } satisfies IRedditCommunityComment.ICreate;

  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: communityName,
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 10. Validate the comment content
  TestValidator.equals("comment body matches", comment.body, commentBody.body);
  TestValidator.equals("comment parent_id is null", comment.parent_id, null);
  TestValidator.equals(
    "comment post id matches",
    comment.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment user id matches",
    comment.reddit_community_user_id,
    user.id,
  );
}
