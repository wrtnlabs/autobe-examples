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
 * Validate pagination boundaries when listing post snapshots as a platform
 * admin.
 *
 * Business context: A platform administrator needs to review edit history of
 * posts via /communityPlatform/platformAdmin/posts/{postId}/snapshots, which is
 * paginated and sortable by snapshot creation time. This test ensures that
 * pagination metadata (page, limit, records, pages) and per-page data slices
 * behave consistently, especially at boundaries (first/last page and overflown
 * page index).
 *
 * Scenario steps:
 *
 * 1. Register and implicitly authenticate a platform admin.
 * 2. As platform admin, create a community visibility level.
 * 3. As platform admin, create a post type.
 * 4. Register and implicitly authenticate a member user.
 * 5. As member user, create a community that uses the previously created
 *    visibility level.
 * 6. As member user, create a post in that community using the created post type.
 * 7. As platform admin (token automatically set by auth.join), call the snapshots
 *    index endpoint with sort_direction="desc" and limit=3 on page=1. Use the
 *    result to derive totalRecords and pages and validate core pagination
 *    invariants.
 * 8. If there are multiple pages (pages >= 2), call page=2 and compare IDs and
 *    ordering between page 1 and 2 to ensure no overlaps and stable descending
 *    created_at ordering.
 * 9. If pages >= 3, call page=3 and perform similar checks.
 * 10. Call the endpoint with page = pages + 1 (or page=2 when pages===0) and verify
 *     that it returns a structurally valid response where pagination.current
 *     equals the requested page and data.length is consistent with
 *     pagination.records/pages assumptions.
 */
export async function test_api_post_snapshots_listing_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (also sets Authorization header automatically)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a visibility level as platform admin
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create a post type as platform admin
  const postTypeCode = `text-${RandomGenerator.alphaNumeric(8)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post Type",
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

  // 4. Register a member user (this call will overwrite Authorization header)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Create a community under the member user using the created visibility level
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: "Snapshot Pagination Test Community",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
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

  // 6. Create a post in the community using the created post type
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "Snapshot Pagination Target Post",
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    image_uri: undefined,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // At this point, platform may have created at least one snapshot for the post.
  // Switch back to platform admin context to call the snapshots listing.
  const platformAdminLoginBody = {
    identifier: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 7. Call snapshots index with page=1, limit=3, sort_direction="desc"
  const baseLimit = 3 as const;
  const firstPageRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: baseLimit as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort_direction: "desc" as const,
    created_at_from: undefined,
    created_at_to: undefined,
    is_edited: undefined,
  } satisfies ICommunityPlatformPostSnapshot.IRequest;

  const firstPage: IPageICommunityPlatformPostSnapshot.ISummary =
    await api.functional.communityPlatform.platformAdmin.posts.snapshots.index(
      connection,
      {
        postId: post.id,
        body: firstPageRequest,
      },
    );
  typia.assert(firstPage);

  const pagination1 = firstPage.pagination;
  const data1 = firstPage.data;

  // Basic pagination invariants on first page
  TestValidator.equals(
    "first page current index should match requested page",
    pagination1.current,
    1,
  );
  TestValidator.equals(
    "first page limit should match requested limit",
    pagination1.limit,
    baseLimit,
  );
  TestValidator.predicate(
    "records should be non-negative and at least data length",
    pagination1.records >= 0 && pagination1.records >= data1.length,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    pagination1.pages >= 0,
  );

  if (pagination1.records === 0) {
    // When there is no snapshot at all, we still validate that data is empty
    TestValidator.equals("no records implies no data", data1.length, 0);
  } else {
    // When there are records, pages must be at least 1
    TestValidator.predicate(
      "positive records imply at least one page",
      pagination1.pages >= 1,
    );
  }

  // Validate descending created_at ordering within first page data
  if (data1.length > 1) {
    for (let i = 1; i < data1.length; i++) {
      const prev = data1[i - 1];
      const curr = data1[i];
      const prevTime = new Date(prev.created_at).getTime();
      const currTime = new Date(curr.created_at).getTime();
      TestValidator.predicate(
        `created_at should be non-increasing within first page at index ${i}`,
        prevTime >= currTime,
      );
    }
  }

  // 8. If multiple pages exist, fetch page 2 and validate non-overlapping IDs and ordering
  if (pagination1.pages >= 2) {
    const secondPageRequest = {
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: baseLimit as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      sort_direction: "desc" as const,
      created_at_from: undefined,
      created_at_to: undefined,
      is_edited: undefined,
    } satisfies ICommunityPlatformPostSnapshot.IRequest;

    const secondPage: IPageICommunityPlatformPostSnapshot.ISummary =
      await api.functional.communityPlatform.platformAdmin.posts.snapshots.index(
        connection,
        {
          postId: post.id,
          body: secondPageRequest,
        },
      );
    typia.assert(secondPage);

    const pagination2 = secondPage.pagination;
    const data2 = secondPage.data;

    TestValidator.equals(
      "second page current index should match requested page",
      pagination2.current,
      2,
    );
    TestValidator.equals(
      "second page limit should match requested limit",
      pagination2.limit,
      baseLimit,
    );

    // IDs between page 1 and 2 must not overlap
    const ids1 = data1.map((s) => s.id);
    const ids2 = data2.map((s) => s.id);
    const overlap = ids1.filter((id) => ids2.includes(id));
    TestValidator.equals(
      "no overlapping snapshot IDs between page 1 and 2",
      overlap.length,
      0,
    );

    // Descending created_at ordering within second page
    if (data2.length > 1) {
      for (let i = 1; i < data2.length; i++) {
        const prev = data2[i - 1];
        const curr = data2[i];
        const prevTime = new Date(prev.created_at).getTime();
        const currTime = new Date(curr.created_at).getTime();
        TestValidator.predicate(
          `created_at should be non-increasing within second page at index ${i}`,
          prevTime >= currTime,
        );
      }
    }
  }

  // 9. If at least 3 pages exist, validate page 3 similarly
  if (pagination1.pages >= 3) {
    const thirdPageRequest = {
      page: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: baseLimit as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      sort_direction: "desc" as const,
      created_at_from: undefined,
      created_at_to: undefined,
      is_edited: undefined,
    } satisfies ICommunityPlatformPostSnapshot.IRequest;

    const thirdPage: IPageICommunityPlatformPostSnapshot.ISummary =
      await api.functional.communityPlatform.platformAdmin.posts.snapshots.index(
        connection,
        {
          postId: post.id,
          body: thirdPageRequest,
        },
      );
    typia.assert(thirdPage);

    const pagination3 = thirdPage.pagination;
    const data3 = thirdPage.data;

    TestValidator.equals(
      "third page current index should match requested page",
      pagination3.current,
      3,
    );

    // Also ensure no overlap with first page IDs
    const ids1 = firstPage.data.map((s) => s.id);
    const ids3 = data3.map((s) => s.id);
    const overlap13 = ids1.filter((id) => ids3.includes(id));
    TestValidator.equals(
      "no overlapping snapshot IDs between page 1 and 3",
      overlap13.length,
      0,
    );
  }

  // 10. Out-of-range page index: page = pages + 1 (or 2 when pages===0)
  const outOfRangePage = pagination1.pages > 0 ? pagination1.pages + 1 : 2;

  const outOfRangeRequest = {
    page: outOfRangePage as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: baseLimit as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort_direction: "desc" as const,
    created_at_from: undefined,
    created_at_to: undefined,
    is_edited: undefined,
  } satisfies ICommunityPlatformPostSnapshot.IRequest;

  const outOfRangePageResult: IPageICommunityPlatformPostSnapshot.ISummary =
    await api.functional.communityPlatform.platformAdmin.posts.snapshots.index(
      connection,
      {
        postId: post.id,
        body: outOfRangeRequest,
      },
    );
  typia.assert(outOfRangePageResult);

  const outPagination = outOfRangePageResult.pagination;
  const outData = outOfRangePageResult.data;

  TestValidator.equals(
    "out-of-range page current index should equal requested page",
    outPagination.current,
    outOfRangePage,
  );

  // When requesting beyond pages and records>0, service may return empty data or
  // clamp; we only assert that data length does not exceed limit and that
  // records/pages remain coherent.
  TestValidator.predicate(
    "out-of-range page data length must not exceed limit",
    outData.length <= outPagination.limit,
  );

  if (outPagination.records === 0) {
    TestValidator.equals(
      "no records implies pages is zero",
      outPagination.pages,
      0,
    );
  } else if (outPagination.limit > 0) {
    TestValidator.predicate(
      "pages should be at least ceil(records/limit) when limit>0",
      outPagination.pages >=
        Math.ceil(outPagination.records / outPagination.limit),
    );
  }
}
