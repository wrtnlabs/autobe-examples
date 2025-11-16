import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";

/**
 * Verify that listing post snapshots via the platformAdmin endpoint enforces
 * strict platform-admin-only access control.
 *
 * Business flow:
 *
 * 1. Register a platform admin account; this also authenticates as that admin.
 * 2. As platform admin, create a visibility level and a post type used for
 *    subsequent community and post creation.
 * 3. Register a member user account (which authenticates as that member).
 * 4. As the member user, create a community and a post within that community.
 * 5. Attempt to list snapshots for the created post without authorization by using
 *    a fresh connection with empty headers; expect failure.
 * 6. Attempt to list snapshots as the member user (non-admin); expect
 *    authorization failure.
 * 7. Log back in as the platform admin and successfully list snapshots for the
 *    post, receiving a valid paginated snapshot list.
 */
export async function test_api_post_snapshots_listing_access_control_requires_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain authenticated admin session
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(12);
  const platformAdminHref: string = typia.random<string & tags.Format<"uri">>();
  const platformAdminReferrer: string = typia.random<
    string & tags.Format<"uri">
  >();

  const joinedAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: platformAdminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(2),
        ip: RandomGenerator.mobile(),
        href: platformAdminHref,
        referrer: platformAdminReferrer,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(joinedAdmin);

  // 2. As platform admin, create a visibility level and a post type
  const visibilityCode = RandomGenerator.alphaNumeric(8);
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  const postTypeCode = RandomGenerator.alphaNumeric(8);
  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: {
          code: postTypeCode,
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformPostType.ICreate,
      },
    );
  typia.assert(postType);

  // 3. Register a member user; join authenticates as that member user
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);
  const memberHref: string = typia.random<string & tags.Format<"uri">>();
  const memberReferrer: string = typia.random<string & tags.Format<"uri">>();

  const joinedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: memberEmail,
        password: memberPassword,
        ip: null,
        href: memberHref,
        referrer: memberReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(joinedMember);

  // 4. As member user, create a community and a post within that community
  const communityCreate = {
    identifier: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreate },
    );
  typia.assert(community);

  const postCreate = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.name(4),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // Common request body for snapshot listing
  const snapshotRequestBody = {
    page: 1,
    limit: 10,
    sort_direction: "desc" as const,
    created_at_from: null,
    created_at_to: null,
    is_edited: null,
  } satisfies ICommunityPlatformPostSnapshot.IRequest;

  // 5. Unauthenticated call: use a fresh connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated clients cannot list post snapshots",
    async () => {
      await api.functional.communityPlatform.platformAdmin.posts.snapshots.index(
        unauthenticatedConnection,
        {
          postId: post.id,
          body: snapshotRequestBody,
        },
      );
    },
  );

  // 6. Authenticated as member user (non-admin): should also fail authorization
  // Ensure connection is in member-user context by logging in with correct password
  const reLoggedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberEmail,
        password: memberPassword,
        ip: null,
        href: memberHref,
        referrer: memberReferrer,
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(reLoggedMember);

  await TestValidator.error(
    "member user cannot access platform admin snapshot listing",
    async () => {
      await api.functional.communityPlatform.platformAdmin.posts.snapshots.index(
        connection,
        {
          postId: post.id,
          body: snapshotRequestBody,
        },
      );
    },
  );

  // 7. Log back in as platform admin and successfully list snapshots
  const loggedInAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminEmail,
        password: platformAdminPassword,
        ip: null,
        href: platformAdminHref,
        referrer: platformAdminReferrer,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  const page: IPageICommunityPlatformPostSnapshot.ISummary =
    await api.functional.communityPlatform.platformAdmin.posts.snapshots.index(
      connection,
      {
        postId: post.id,
        body: snapshotRequestBody,
      },
    );
  typia.assert(page);

  // Basic business validations on the successful response
  TestValidator.predicate(
    "pagination current page should be 1",
    page.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    page.pagination.limit === 10,
  );
  TestValidator.predicate(
    "snapshots listed belong to the target post",
    page.data.every((snap) => snap.post_id === post.id),
  );
}
