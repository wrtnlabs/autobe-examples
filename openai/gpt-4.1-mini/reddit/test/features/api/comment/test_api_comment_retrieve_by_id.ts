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

/**
 * Validate retrieval of a detailed comment using communityName, postId, and
 * commentId.
 *
 * This test covers a full realistic flow:
 *
 * 1. Authenticate as admin, create a content type.
 * 2. Authenticate as user, create a community.
 * 3. Create an admin user, then create an admin record for that user.
 * 4. Using the community name and created content type, user creates a post.
 * 5. User creates a parent comment on the post.
 * 6. User creates a nested child comment referencing the parent comment.
 * 7. Retrieve the parent comment and verify all properties.
 * 8. Retrieve the nested child comment and verify its parent_id.
 * 9. Confirm fetching a non-existent comment ID triggers error.
 *
 * This verifies accurate entity linking, nested comment retrieval, and error
 * handling. It tests proper security context switching between admin and user
 * roles. It ensures full property set validation and response consistency.
 *
 * Steps leverage exact DTO types and API call conventions.
 */
export async function test_api_comment_retrieve_by_id(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminUserEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUserPassword = "AdminUserPass123";
  const adminUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: adminUserEmail,
        password: adminUserPassword,
        ip: undefined,
        href: "https://example.com",
        referrer: "https://referrer.com",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(adminUser);

  // 2. Create admin record based on admin user's user_id
  const adminAccount: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: adminUser.id,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminAccount);

  // 3. Admin login to authenticate as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminUserEmail,
      password: adminUserPassword,
      ip: undefined,
      href: "https://example.com",
      referrer: "https://referrer.com",
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 4. User join and login for actor switching and community creation
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword = "UserPass1234";
  const userAccount: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        ip: undefined,
        href: "https://example.com",
        referrer: "https://referrer.com",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(userAccount);

  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      ip: undefined,
      href: "https://example.com",
      referrer: "https://referrer.com",
    } satisfies IRedditCommunityUser.ILogin,
  });

  // 5. As admin, create a content type
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

  // 6. As user, create a community
  const communityName = RandomGenerator.paragraph({ sentences: 1 })
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 7. As user, create a post in the community
  const postTitle = RandomGenerator.paragraph({ sentences: 4 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: postTitle,
          body: postBody,
          reddit_community_content_type_id: contentType.id,
          status: "active",
          image_uri: null,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);

  // 8. Create a parent comment on the post
  const parentCommentBody = RandomGenerator.paragraph({ sentences: 3 });
  const parentComment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        body: {
          body: parentCommentBody,
          parent_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(parentComment);

  // 9. Create a nested child comment referencing the parent comment
  const childCommentBody = RandomGenerator.paragraph({ sentences: 2 });
  const childComment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        body: {
          body: childCommentBody,
          parent_id: parentComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(childComment);

  // 10. Retrieve the parent comment and validate
  const retrievedParentComment: IRedditCommunityComment =
    await api.functional.redditCommunity.communities.posts.comments.at(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        commentId: parentComment.id,
      },
    );
  typia.assert(retrievedParentComment);
  TestValidator.equals(
    "parent comment id",
    retrievedParentComment.id,
    parentComment.id,
  );
  TestValidator.equals(
    "parent comment body",
    retrievedParentComment.body,
    parentCommentBody,
  );
  TestValidator.equals(
    "parent comment parent_id",
    retrievedParentComment.parent_id,
    null,
  );

  // 11. Retrieve the child comment and validate
  const retrievedChildComment: IRedditCommunityComment =
    await api.functional.redditCommunity.communities.posts.comments.at(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        commentId: childComment.id,
      },
    );
  typia.assert(retrievedChildComment);
  TestValidator.equals(
    "child comment id",
    retrievedChildComment.id,
    childComment.id,
  );
  TestValidator.equals(
    "child comment body",
    retrievedChildComment.body,
    childCommentBody,
  );
  TestValidator.equals(
    "child comment parent_id",
    retrievedChildComment.parent_id,
    parentComment.id,
  );

  // 12. Attempt to retrieve a non-existent comment id and expect failure
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieve non-existent comment should fail",
    async () => {
      await api.functional.redditCommunity.communities.posts.comments.at(
        connection,
        {
          communityName: community.name,
          postId: post.id,
          commentId: nonExistentCommentId,
        },
      );
    },
  );
}
