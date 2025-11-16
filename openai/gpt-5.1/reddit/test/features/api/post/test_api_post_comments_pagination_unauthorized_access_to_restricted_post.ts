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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

/**
 * Verify that comments listing for a restricted post is not accessible to an
 * unauthorized member, while the post owner can paginate comments
 * successfully.
 *
 * Business journey:
 *
 * 1. A platform admin account is registered and used to create a new community
 *    visibility level that will conceptually represent a restricted/private
 *    community type.
 * 2. Two member users are registered: `memberOwner` and `memberStranger`.
 * 3. As `memberOwner`, a community is created using the restricted visibility
 *    level code.
 * 4. Still as `memberOwner`, a post is created inside that restricted community,
 *    and several comments are added under it.
 * 5. Authentication is switched to `memberStranger`, who has no relation to the
 *    restricted community (no membership APIs exist in the materials), and this
 *    user attempts to paginate comments for the restricted post via PATCH
 *    /communityPlatform/posts/{postId}/comments.
 * 6. The attempt from `memberStranger` is expected to fail with an error, and the
 *    test verifies that the call throws (without asserting concrete HTTP status
 *    codes).
 * 7. Authentication is switched back to `memberOwner`, who then calls the same
 *    comments listing endpoint and is expected to retrieve the comment
 *    summaries successfully, confirming that the endpoint works and that
 *    failure for `memberStranger` is due to authorization/visibility
 *    constraints rather than misconfiguration.
 */
export async function test_api_post_comments_pagination_unauthorized_access_to_restricted_post(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and create a restricted visibility level.
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.console.local/register",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdmin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: platformAdminJoinBody,
    },
  );
  typia.assert(platformAdmin);

  const visibilityCode = `restricted_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Restricted Community Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 2. Register two member users: owner and stranger.
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(12);
  const ownerJoinBody = {
    username: RandomGenerator.name(1),
    email: ownerEmail,
    password: ownerPassword,
    ip: null,
    href: "https://community.app.local/join",
    referrer: "https://community.app.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const ownerAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: ownerJoinBody,
    },
  );
  typia.assert(ownerAuthorized);

  const strangerEmail = typia.random<string & tags.Format<"email">>();
  const strangerPassword = RandomGenerator.alphaNumeric(12);
  const strangerJoinBody = {
    username: RandomGenerator.name(1),
    email: strangerEmail,
    password: strangerPassword,
    ip: null,
    href: "https://community.app.local/join",
    referrer: "https://community.app.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const strangerAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: strangerJoinBody,
    },
  );
  typia.assert(strangerAuthorized);

  // Ensure we are authenticated as the owner (join already logged in, but be explicit).
  const ownerLoginBody = {
    identifier: ownerEmail,
    password: ownerPassword,
    ip: null,
    href: "https://community.app.local/login",
    referrer: "https://community.app.local/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const ownerLogin = await api.functional.auth.memberUser.login(connection, {
    body: ownerLoginBody,
  });
  typia.assert(ownerLogin);

  // 3. As owner, create a community with the restricted visibility level.
  const communityCreateBody = {
    identifier: `restricted-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. As owner, create a post in this community.
  // We need a post_type_id; since there is no catalog endpoint, use a random UUID.
  const postTypeId = typia.random<string & tags.Format<"uuid">>();
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postTypeId,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: postCreateBody,
    },
  );
  typia.assert(post);

  // 5. As owner, create several comments under the post.
  const commentCount = 3;
  const createdComments: ICommunityPlatformComment[] = [];
  for (let i = 0; i < commentCount; i += 1) {
    const commentCreateBody = {
      body: RandomGenerator.paragraph({ sentences: 5 }),
      parentCommentId: undefined,
      renderingMode: "markdown" as const,
    } satisfies ICommunityPlatformComment.ICreate;
    const comment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: commentCreateBody,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }

  TestValidator.equals(
    "created comments count should match",
    createdComments.length,
    commentCount,
  );

  // 6. Switch to stranger account and try to paginate comments (expected to fail).
  const strangerLoginBody = {
    identifier: strangerEmail,
    password: strangerPassword,
    ip: null,
    href: "https://community.app.local/login",
    referrer: "https://community.app.local/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const strangerLogin = await api.functional.auth.memberUser.login(connection, {
    body: strangerLoginBody,
  });
  typia.assert(strangerLogin);

  const unauthorizedRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: (commentCount + 5) as number & tags.Type<"int32"> & tags.Minimum<1>,
    cursor: undefined,
    sort: "createdAtAsc" as const,
    includeDeleted: false,
    parentCommentId: undefined,
    authorMemberUserId: undefined,
  } satisfies ICommunityPlatformComment.IRequest;

  await TestValidator.error(
    "stranger should not be able to list restricted post comments",
    async () => {
      await api.functional.communityPlatform.posts.comments.index(connection, {
        postId: post.id,
        body: unauthorizedRequestBody,
      });
    },
  );

  // 7. Switch back to owner and verify they can list comments successfully.
  const ownerLoginAgain = await api.functional.auth.memberUser.login(
    connection,
    {
      body: ownerLoginBody,
    },
  );
  typia.assert(ownerLoginAgain);

  const authorizedRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: (commentCount + 5) as number & tags.Type<"int32"> & tags.Minimum<1>,
    cursor: undefined,
    sort: "createdAtAsc" as const,
    includeDeleted: false,
    parentCommentId: undefined,
    authorMemberUserId: undefined,
  } satisfies ICommunityPlatformComment.IRequest;

  const commentsPage =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: authorizedRequestBody,
    });
  typia.assert<IPageICommunityPlatformComment.ISummary>(commentsPage);

  TestValidator.predicate(
    "owner should see at least as many comments as created",
    commentsPage.data.length >= createdComments.length,
  );
}
