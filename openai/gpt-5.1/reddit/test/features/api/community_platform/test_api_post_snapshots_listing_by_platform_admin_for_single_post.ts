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
 * Validate platform admin listing of post snapshots for a single post.
 *
 * Business flow:
 *
 * 1. Register a platform admin and obtain tokens (join).
 * 2. As the platform admin, create a community visibility level master row.
 * 3. As the platform admin, create a post type master row (e.g., text).
 * 4. Register a member user and obtain tokens.
 * 5. As the member user, create a community referencing the visibility level code.
 * 6. As the member user, create a post in that community using the post type id.
 * 7. As the platform admin again, call the snapshots listing endpoint for that
 *    post with specific pagination and filter parameters.
 * 8. Assert that the response matches
 *    IPageICommunityPlatformPostSnapshot.ISummary, that every snapshot (if any)
 *    has post_id equal to the target post id and community/author consistent
 *    with the created community and member, and that the snapshots are ordered
 *    by created_at according to sort_direction. Also validate that pagination
 *    metadata is self-consistent with the returned data size for the chosen
 *    page and limit.
 */
export async function test_api_post_snapshots_listing_by_platform_admin_for_single_post(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) - also authenticates as that admin
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create visibility level as platform admin
  const visibilityCode = `vis-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility level code should match",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Create post type as platform admin
  const postTypeCode = `type-${RandomGenerator.alphaNumeric(8)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: `PostType ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
    "post type code should match",
    postType.code,
    postTypeCode,
  );

  // 4. Register member user (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Login member user explicitly (actor switch safety)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  // 6. Create community as member user, referencing visibility level code
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
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
    "community identifier should match",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community visibility level code should match master code",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 7. Create a post in that community as member user
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: `Post ${RandomGenerator.name(1)}`,
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community id should match created community",
    post.community.id,
    community.id,
  );
  TestValidator.equals(
    "post type id should match created post type",
    post.postType.id,
    postType.id,
  );

  const targetPostId = post.id;

  // 8. Switch back to platform admin to call snapshots endpoint
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 9. Call snapshots listing with pagination and sorting
  const firstPageRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort_direction: "desc" as const,
    created_at_from: null,
    created_at_to: null,
    is_edited: null,
  } satisfies ICommunityPlatformPostSnapshot.IRequest;

  const firstPage: IPageICommunityPlatformPostSnapshot.ISummary =
    await api.functional.communityPlatform.platformAdmin.posts.snapshots.index(
      connection,
      {
        postId: targetPostId,
        body: firstPageRequest,
      },
    );
  typia.assert(firstPage);

  const pagination = firstPage.pagination;
  const snapshots = firstPage.data;

  // Basic pagination sanity checks
  TestValidator.equals(
    "pagination current should equal requested page",
    pagination.current,
    firstPageRequest.page,
  );
  TestValidator.predicate(
    "pagination limit should be > 0",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length should not exceed requested limit",
    snapshots.length <= firstPageRequest.limit,
  );

  // 10. If any snapshots exist, perform stronger validations
  if (snapshots.length > 0) {
    // All snapshots should belong to the target post and match community and author
    for (const snap of snapshots) {
      TestValidator.equals(
        "snapshot post_id should match target post id",
        snap.post_id,
        targetPostId,
      );
      TestValidator.equals(
        "snapshot community id should match post community id",
        snap.community_id,
        community.id,
      );
      TestValidator.equals(
        "snapshot community summary id should match community id",
        snap.community.id,
        community.id,
      );
      TestValidator.equals(
        "snapshot author summary id should match post author id",
        snap.author.id,
        post.author.id,
      );
    }

    // Verify descending order by created_at for "desc" sort_direction
    for (let i = 1; i < snapshots.length; i++) {
      const prev = snapshots[i - 1];
      const curr = snapshots[i];
      TestValidator.predicate(
        "snapshots should be ordered by created_at desc",
        prev.created_at >= curr.created_at,
      );
    }

    // 11. Try ascending sort and limited window filters using created_at bounds
    const minCreatedAt = snapshots[snapshots.length - 1].created_at;
    const maxCreatedAt = snapshots[0].created_at;

    const filteredRequest = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      sort_direction: "asc" as const,
      created_at_from: minCreatedAt,
      created_at_to: maxCreatedAt,
      is_edited: null,
    } satisfies ICommunityPlatformPostSnapshot.IRequest;

    const filteredPage: IPageICommunityPlatformPostSnapshot.ISummary =
      await api.functional.communityPlatform.platformAdmin.posts.snapshots.index(
        connection,
        {
          postId: targetPostId,
          body: filteredRequest,
        },
      );
    typia.assert(filteredPage);

    const filteredSnapshots = filteredPage.data;

    TestValidator.predicate(
      "filtered snapshots data length should not exceed limit",
      filteredSnapshots.length <= filteredRequest.limit,
    );

    // Each filtered snapshot must be within the time window
    for (const snap of filteredSnapshots) {
      TestValidator.predicate(
        "filtered snapshot created_at should be >= from",
        snap.created_at >= minCreatedAt,
      );
      TestValidator.predicate(
        "filtered snapshot created_at should be <= to",
        snap.created_at <= maxCreatedAt,
      );
    }

    // Ascending ordering check
    for (let i = 1; i < filteredSnapshots.length; i++) {
      const prev = filteredSnapshots[i - 1];
      const curr = filteredSnapshots[i];
      TestValidator.predicate(
        "filtered snapshots should be ordered by created_at asc",
        prev.created_at <= curr.created_at,
      );
    }
  }
}
