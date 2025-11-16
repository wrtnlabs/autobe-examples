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
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_posts_index_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and creates basic configuration: visibility level and post type.
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevelCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  const postTypeCode = `text_${RandomGenerator.alphaNumeric(6)}`;
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

  // 2. Member user joins and creates a community using the created visibility level.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(6)}`,
    title: `Community ${RandomGenerator.name(1)}`,
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

  // 3. Member user creates more posts than the page size in that community.
  const pageLimit = 10;
  const totalPostsToCreate = 25;

  const createdPostIds: (string & tags.Format<"uuid">)[] = [];

  for (let i = 0; i < totalPostsToCreate; i += 1) {
    const postCreateBody = {
      community_id: community.id,
      post_type_id: postType.id,
      title: `Post ${i + 1}: ${RandomGenerator.paragraph({ sentences: 3 })}`,
      body: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 6,
        wordMin: 3,
        wordMax: 10,
      }),
      url: undefined,
      image_uri: undefined,
    } satisfies ICommunityPlatformPost.ICreate;

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        {
          body: postCreateBody,
        },
      );
    typia.assert(post);
    createdPostIds.push(post.id);
  }

  // 4. Call PATCH /communityPlatform/posts for page 1 and validate metadata.
  const requestFilterBase: ICommunityPlatformPost.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: pageLimit as number & tags.Type<"int32"> & tags.Minimum<1>,
    community_ids: [community.id],
    author_memberuser_ids: undefined,
    post_type_ids: undefined,
    state_codes: undefined,
    visibility_levels: undefined,
    search_query: undefined,
    posted_from: undefined,
    posted_to: undefined,
    sort_by: undefined,
    sort_direction: undefined,
  };

  const page1: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(connection, {
      body: requestFilterBase,
    });
  typia.assert(page1);

  const pagination1 = page1.pagination;
  typia.assert<IPage.IPagination>(pagination1);

  TestValidator.equals(
    "page 1: current page index should be 1",
    pagination1.current,
    1,
  );
  TestValidator.equals(
    "page 1: limit should equal requested page size",
    pagination1.limit,
    pageLimit,
  );
  TestValidator.equals(
    "page 1: data length should equal page limit",
    page1.data.length,
    pageLimit,
  );

  const expectedPages =
    pagination1.limit > 0
      ? Math.ceil(pagination1.records / pagination1.limit)
      : 0;

  TestValidator.equals(
    "page 1: pages should match ceil(records/limit)",
    pagination1.pages,
    expectedPages,
  );

  // 5. Request page 2 and validate again.
  const requestFilterPage2: ICommunityPlatformPost.IRequest = {
    ...requestFilterBase,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };

  const page2: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(connection, {
      body: requestFilterPage2,
    });
  typia.assert(page2);

  const pagination2 = page2.pagination;
  typia.assert<IPage.IPagination>(pagination2);

  TestValidator.equals(
    "page 2: current page index should be 2",
    pagination2.current,
    2,
  );
  TestValidator.equals(
    "page 2: limit should equal requested page size",
    pagination2.limit,
    pageLimit,
  );

  const expectedPage2Size =
    pagination2.records - pageLimit >= pageLimit
      ? pageLimit
      : Math.max(pagination2.records - pageLimit, 0);

  TestValidator.equals(
    "page 2: data length should reflect remaining records",
    page2.data.length,
    expectedPage2Size,
  );

  TestValidator.equals(
    "page 2: pages should match ceil(records/limit)",
    pagination2.pages,
    expectedPages,
  );

  // 6. Request a page index beyond the total pages (e.g., 999) and
  // verify behavior: metadata must stay consistent with first page in
  // terms of records and pages. We do not assert on current or data
  // length because both clamping and empty result behaviors are
  // allowed by the pagination contract.
  const outOfRangePageIndex = 999;
  const requestFilterOutOfRange: ICommunityPlatformPost.IRequest = {
    ...requestFilterBase,
    page: outOfRangePageIndex as number & tags.Type<"int32"> & tags.Minimum<1>,
  };

  const pageOutOfRange: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(connection, {
      body: requestFilterOutOfRange,
    });
  typia.assert(pageOutOfRange);

  const paginationOut = pageOutOfRange.pagination;
  typia.assert<IPage.IPagination>(paginationOut);

  TestValidator.equals(
    "out-of-range page: records should remain consistent",
    paginationOut.records,
    pagination1.records,
  );
  TestValidator.equals(
    "out-of-range page: pages should remain consistent",
    paginationOut.pages,
    pagination1.pages,
  );

  // 7. Iterate through all valid pages and ensure union of IDs has no duplicates
  // and that total collected posts align with pagination.records.
  const collectedIds: (string & tags.Format<"uuid">)[] = [];

  for (let pageIndex = 1; pageIndex <= pagination1.pages; pageIndex += 1) {
    const body: ICommunityPlatformPost.IRequest = {
      ...requestFilterBase,
      page: pageIndex as number & tags.Type<"int32"> & tags.Minimum<1>,
    };

    const page: IPageICommunityPlatformPost.ISummary =
      await api.functional.communityPlatform.posts.index(connection, {
        body,
      });
    typia.assert(page);

    for (const summary of page.data) {
      collectedIds.push(summary.id);
    }
  }

  const uniqueIds = Array.from(new Set(collectedIds));
  TestValidator.equals(
    "no duplicate post IDs across paginated results",
    uniqueIds.length,
    collectedIds.length,
  );

  TestValidator.equals(
    "collected post count should equal pagination.records",
    collectedIds.length,
    pagination1.records,
  );

  TestValidator.predicate(
    "pagination.records should be greater than or equal to created posts",
    pagination1.records >= totalPostsToCreate,
  );
}
