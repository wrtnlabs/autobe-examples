import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Fetch a freshly created comment detail under a post and verify all
 * relationships and freshness flags.
 *
 * Business workflow:
 *
 * 1. Register a platform admin and get admin auth.
 * 2. As platform admin, create a community visibility level master.
 * 3. As platform admin, create a post type master.
 * 4. Register a member user and get member auth.
 * 5. As member user, create a community referencing the visibility level.
 * 6. As member user, create a post in that community referencing the post type.
 * 7. As member user, create a comment under that post.
 * 8. Fetch the comment detail publicly by postId and commentId.
 *
 * Validations focus on:
 *
 * - Correct ICommunityPlatformComment structure via typia.assert.
 * - ID consistency for comment, post, and author.
 * - Body text equality with creation payload.
 * - Freshness flags: is_edited === false and deleted_at === null.
 * - Created_at and updated_at presence and chronological ordering.
 */
export async function test_api_comment_detail_fetch_after_creation(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and authenticate
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.local/join",
    referrer: "https://admin.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. As platform admin, create a community visibility level master
  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibility);
  TestValidator.equals(
    "created visibility level code matches",
    visibility.code,
    visibilityCode,
  );

  // 3. As platform admin, create a post type master
  const postTypeCode = `text-${RandomGenerator.alphabets(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);
  TestValidator.equals(
    "created post type code matches",
    postType.code,
    postTypeCode,
  );

  // 4. Register a member user and authenticate
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://app.local/join",
    referrer: "https://app.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 5. As member user, create a community referencing the visibility level code
  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: communityTitle,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    communityIdentifier,
  );

  // 6. As member user, create a text post in that community
  const postTitle = RandomGenerator.paragraph({ sentences: 4 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: postTitle,
    body: postBody,
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);
  TestValidator.equals(
    "post community id matches",
    post.community.id,
    community.id,
  );
  TestValidator.equals("post type id matches", post.postType.id, postType.id);

  // 7. As member user, create a comment under that post
  const commentBodyText = RandomGenerator.paragraph({ sentences: 5 });
  const commentCreateBody = {
    body: commentBodyText,
    parentCommentId: undefined,
    renderingMode: "markdown",
  } satisfies ICommunityPlatformComment.ICreate;

  const createdComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(createdComment);

  TestValidator.equals(
    "created comment post summary id matches post id",
    createdComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "created comment author matches member user",
    createdComment.author.id,
    memberUser.id,
  );
  TestValidator.equals(
    "created comment body matches input",
    createdComment.body,
    commentBodyText,
  );
  TestValidator.equals(
    "created comment parentComment is null for top-level",
    createdComment.parentComment,
    null,
  );

  // 8. Fetch the comment detail publicly by postId and commentId
  const fetched: ICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.at(connection, {
      postId: post.id,
      commentId: createdComment.id,
    });
  typia.assert(fetched);

  // Core validations
  TestValidator.equals(
    "fetched comment id matches created comment id",
    fetched.id,
    createdComment.id,
  );
  TestValidator.equals(
    "fetched comment post id matches original post id",
    fetched.post.id,
    post.id,
  );
  TestValidator.equals(
    "fetched comment author id matches member user id",
    fetched.author.id,
    memberUser.id,
  );
  TestValidator.equals(
    "fetched comment body matches creation body",
    fetched.body,
    commentBodyText,
  );

  // Freshness flags: newly created, so not edited and not deleted
  TestValidator.equals(
    "fresh comment must not be edited",
    fetched.is_edited,
    false,
  );
  TestValidator.equals(
    "fresh comment must not be deleted",
    fetched.deleted_at,
    null,
  );

  // created_at and updated_at should be set and created_at <= updated_at
  const createdAt = fetched.created_at;
  const updatedAt = fetched.updated_at;

  TestValidator.predicate(
    "created_at must be non-empty string",
    createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be non-empty string",
    updatedAt.length > 0,
  );
  TestValidator.predicate(
    "created_at must be less than or equal to updated_at (ISO string compare)",
    createdAt <= updatedAt,
  );
}
