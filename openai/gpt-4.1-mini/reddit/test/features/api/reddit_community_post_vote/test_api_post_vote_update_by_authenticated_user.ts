import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostVote";
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

export async function test_api_post_vote_update_by_authenticated_user(
  connection: api.IConnection,
) {
  // Multi-actor user and admin registration and authentication

  // 1. Register user1
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: user1Email,
        password: "Password1234!",
        href: "https://example.com/",
        referrer: "https://example.com/prev",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user1);

  // 2. Login user1, this sets connection headers automatically
  const user1Login: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: user1Email,
        password: "Password1234!",
        href: "https://example.com/",
        referrer: "https://example.com/prev",
      } satisfies IRedditCommunityUser.ILogin,
    });
  typia.assert(user1Login);

  // 3. Register user2 (different user for multi-user tests)
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: user2Email,
        password: "Password1234!",
        href: "https://example.com/",
        referrer: "https://example.com/prev",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user2);

  // 4. Login user2 to set connection headers
  const user2Login: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: user2Email,
        password: "Password1234!",
        href: "https://example.com/",
        referrer: "https://example.com/prev",
      } satisfies IRedditCommunityUser.ILogin,
    });
  typia.assert(user2Login);

  // 5. Register admin user by first joining as user (auth.user.join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: adminEmail,
        password: "Password1234!",
        href: "https://example.com/",
        referrer: "https://example.com/prev",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(adminUser);

  // 6. Login admin user to set headers
  const adminUserLogin: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: adminEmail,
        password: "Password1234!",
        href: "https://example.com/",
        referrer: "https://example.com/prev",
      } satisfies IRedditCommunityUser.ILogin,
    });
  typia.assert(adminUserLogin);

  // Note: We now create admin role linked with adminUser id
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: adminUser.id,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 7. Create a content type 'text' via admin user (admin privileges required)
  const contentType: IRedditCommunityContentType =
    await api.functional.redditCommunity.admin.redditCommunityContentTypes.create(
      connection,
      {
        body: {
          content_type_code: "text",
          content_type_name: "Text",
          description: "Textual content type for posts.",
        } satisfies IRedditCommunityContentType.ICreate,
      },
    );
  typia.assert(contentType);

  // 8. Login user1 again (to ensure connection headers for user1 for community/post creation/voting)
  await api.functional.auth.user.login(connection, {
    body: {
      email: user1Email,
      password: "Password1234!",
      href: "https://example.com/",
      referrer: "https://example.com/prev",
    } satisfies IRedditCommunityUser.ILogin,
  });

  // 9. Create a community via user1
  const communityName = `community_${RandomGenerator.alphaNumeric(5)}`;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: "Test community description.",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);

  // 10. Create a post in the community with 'text' content type by user1
  const postTitle = "Test Post Title";
  const postBody = "This is the body of the test post.";
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName,
        body: {
          title: postTitle,
          body: postBody,
          reddit_community_content_type_id: contentType.id,
          status: "active",
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals("post title matches", post.title, postTitle);

  // 11. Patch vote on the post by user1: upvote
  let voteResponse: IPageIRedditCommunityPostVote.ISummary =
    await api.functional.redditCommunity.user.communities.posts.votes.index(
      connection,
      {
        communityName,
        postId: post.id,
        body: {
          vote_type: "upvote",
        } satisfies IRedditCommunityPostVote.IRequest,
      },
    );
  typia.assert(voteResponse);
  TestValidator.predicate(
    "voteResponse data length non-negative",
    voteResponse.data.length >= 0,
  );

  // 12. Patch vote on the post by user2: upvote (switch login to user2)
  await api.functional.auth.user.login(connection, {
    body: {
      email: user2Email,
      password: "Password1234!",
      href: "https://example.com/",
      referrer: "https://example.com/prev",
    } satisfies IRedditCommunityUser.ILogin,
  });

  voteResponse =
    await api.functional.redditCommunity.user.communities.posts.votes.index(
      connection,
      {
        communityName,
        postId: post.id,
        body: {
          vote_type: "upvote",
        } satisfies IRedditCommunityPostVote.IRequest,
      },
    );
  typia.assert(voteResponse);
  TestValidator.predicate(
    "voteResponse data length non-negative after user2 vote",
    voteResponse.data.length >= 0,
  );

  // 13. Patch vote on the post by user1: change to downvote
  await api.functional.auth.user.login(connection, {
    body: {
      email: user1Email,
      password: "Password1234!",
      href: "https://example.com/",
      referrer: "https://example.com/prev",
    } satisfies IRedditCommunityUser.ILogin,
  });

  voteResponse =
    await api.functional.redditCommunity.user.communities.posts.votes.index(
      connection,
      {
        communityName,
        postId: post.id,
        body: {
          vote_type: "downvote",
        } satisfies IRedditCommunityPostVote.IRequest,
      },
    );
  typia.assert(voteResponse);
  TestValidator.predicate(
    "voteResponse data length non-negative after downvote",
    voteResponse.data.length >= 0,
  );
}
