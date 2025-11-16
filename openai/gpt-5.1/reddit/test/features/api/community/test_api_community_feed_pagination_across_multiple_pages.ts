import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFeed";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_community_feed_pagination_across_multiple_pages(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (creates platformAdmin account and authenticates)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.console.test/join",
    referrer: "https://admin.console.test/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a community visibility level as platformAdmin
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibility);

  // 3. Create a post type as platformAdmin
  const postTypeCode = `text-${RandomGenerator.alphaNumeric(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
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

  // 4. Member user joins (creates memberUser account and authenticates)
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://community.test/join",
    referrer: "https://community.test/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. (Optional but explicit) member user login to ensure fresh session and header context
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://community.test/login",
    referrer: "https://community.test/join-complete",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  // 6. Create a community as memberUser
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
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

  // 7. Create many posts (e.g., 30) in the community as the same memberUser
  const totalPosts = 30;
  const createdPosts: ICommunityPlatformPost[] = [];

  for (let i = 0; i < totalPosts; i += 1) {
    const postCreateBody = {
      community_id: community.id,
      post_type_id: postType.id,
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.paragraph({ sentences: 8 }),
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
    createdPosts.push(post);
  }

  const createdPostCount = createdPosts.length;

  // 8. Fetch community feed page 1
  const pageSize = 10;
  const sortMode = "new";

  const feedRequestPage1 = {
    page: 1 as number & tags.Type<"int32">,
    limit: pageSize as number & tags.Type<"int32">,
    sort_mode: sortMode,
  } satisfies ICommunityPlatformCommunityFeed.IRequest;

  const feedPage1: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.community.index(
      connection,
      {
        communityId: community.id,
        body: feedRequestPage1,
      },
    );
  typia.assert(feedPage1);

  const pagination1: IPage.IPagination = feedPage1.pagination;
  const dataPage1: ICommunityPlatformPost.ISummary[] = feedPage1.data;

  // Basic pagination assertions for page 1
  TestValidator.equals(
    "pagination.limit is pageSize on page 1",
    pagination1.limit,
    pageSize,
  );

  TestValidator.predicate(
    "pagination.records is at least number of created posts",
    pagination1.records >= createdPostCount,
  );

  const expectedMinPages = Math.ceil(createdPostCount / pageSize);
  TestValidator.predicate(
    "pagination.pages is at least ceil(totalPosts / pageSize)",
    pagination1.pages >= expectedMinPages,
  );

  TestValidator.predicate(
    "page 1 data length is between 1 and pageSize",
    dataPage1.length > 0 && dataPage1.length <= pageSize,
  );

  // Collect page 1 ids
  const page1Ids = new Set<string>();
  for (const summary of dataPage1) {
    page1Ids.add(summary.id);
  }

  // 9. Fetch community feed page 2
  const feedRequestPage2 = {
    page: 2 as number & tags.Type<"int32">,
    limit: pageSize as number & tags.Type<"int32">,
    sort_mode: sortMode,
  } satisfies ICommunityPlatformCommunityFeed.IRequest;

  const feedPage2: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.community.index(
      connection,
      {
        communityId: community.id,
        body: feedRequestPage2,
      },
    );
  typia.assert(feedPage2);

  const pagination2: IPage.IPagination = feedPage2.pagination;
  const dataPage2: ICommunityPlatformPost.ISummary[] = feedPage2.data;

  // Pagination metadata consistency between page 1 and 2
  TestValidator.equals(
    "pagination.limit is consistent between page 1 and 2",
    pagination2.limit,
    pagination1.limit,
  );

  TestValidator.equals(
    "pagination.records is consistent between page 1 and 2",
    pagination2.records,
    pagination1.records,
  );

  TestValidator.equals(
    "pagination.pages is consistent between page 1 and 2",
    pagination2.pages,
    pagination1.pages,
  );

  TestValidator.predicate(
    "page 2 data length is between 1 and pageSize",
    dataPage2.length > 0 && dataPage2.length <= pageSize,
  );

  // Collect page 2 ids
  const page2Ids = new Set<string>();
  for (const summary of dataPage2) {
    page2Ids.add(summary.id);
  }

  // Non-overlapping pages: ensure no id appears in both page 1 and page 2
  let overlapFound = false;
  for (const id of page1Ids) {
    if (page2Ids.has(id)) {
      overlapFound = true;
      break;
    }
  }

  TestValidator.predicate(
    "pages 1 and 2 have non-overlapping post ids",
    overlapFound === false,
  );

  // Combined uniqueness of first two pages
  const combinedIds = new Set<string>();
  for (const id of page1Ids) combinedIds.add(id);
  for (const id of page2Ids) combinedIds.add(id);

  TestValidator.equals(
    "combined unique posts from pages 1 and 2 equals total items across both pages",
    combinedIds.size,
    dataPage1.length + dataPage2.length,
  );

  TestValidator.predicate(
    "combined unique posts from pages 1 and 2 does not exceed created posts",
    combinedIds.size <= createdPostCount,
  );

  // 10. Fetch community feed page 3
  const feedRequestPage3 = {
    page: 3 as number & tags.Type<"int32">,
    limit: pageSize as number & tags.Type<"int32">,
    sort_mode: sortMode,
  } satisfies ICommunityPlatformCommunityFeed.IRequest;

  const feedPage3: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.community.index(
      connection,
      {
        communityId: community.id,
        body: feedRequestPage3,
      },
    );
  typia.assert(feedPage3);

  const pagination3: IPage.IPagination = feedPage3.pagination;
  const dataPage3: ICommunityPlatformPost.ISummary[] = feedPage3.data;

  // Metadata consistency for page 3
  TestValidator.equals(
    "pagination.limit is consistent between page 1 and 3",
    pagination3.limit,
    pagination1.limit,
  );
  TestValidator.equals(
    "pagination.records is consistent between page 1 and 3",
    pagination3.records,
    pagination1.records,
  );
  TestValidator.equals(
    "pagination.pages is consistent between page 1 and 3",
    pagination3.pages,
    pagination1.pages,
  );

  TestValidator.predicate(
    "page 3 data length is at most pageSize",
    dataPage3.length <= pageSize,
  );

  const page3Ids = new Set<string>();
  for (const summary of dataPage3) {
    page3Ids.add(summary.id);
  }

  for (const id of page3Ids) {
    combinedIds.add(id);
  }

  TestValidator.predicate(
    "combined posts from pages 1-3 do not exceed created posts",
    combinedIds.size <= createdPostCount,
  );

  // 11. Overbound page fetch: request page > pagination.pages
  const overboundPageIndex = (pagination1.pages + 1) as number &
    tags.Type<"int32">;

  const feedRequestOverbound = {
    page: overboundPageIndex,
    limit: pageSize as number & tags.Type<"int32">,
    sort_mode: sortMode,
  } satisfies ICommunityPlatformCommunityFeed.IRequest;

  const feedOverbound: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.community.index(
      connection,
      {
        communityId: community.id,
        body: feedRequestOverbound,
      },
    );
  typia.assert(feedOverbound);

  const paginationOver: IPage.IPagination = feedOverbound.pagination;
  const dataOver: ICommunityPlatformPost.ISummary[] = feedOverbound.data;

  TestValidator.equals(
    "overbound page returns empty data array",
    dataOver.length,
    0,
  );

  TestValidator.equals(
    "pagination.records is consistent on overbound page",
    paginationOver.records,
    pagination1.records,
  );
  TestValidator.equals(
    "pagination.pages is consistent on overbound page",
    paginationOver.pages,
    pagination1.pages,
  );

  // 12. Determinism check for page 1 with sort_mode = "new"
  const feedPage1Second: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.community.index(
      connection,
      {
        communityId: community.id,
        body: feedRequestPage1,
      },
    );
  typia.assert(feedPage1Second);

  const dataPage1Second: ICommunityPlatformPost.ISummary[] =
    feedPage1Second.data;

  TestValidator.equals(
    "page 1 repeated call returns same number of posts",
    dataPage1Second.length,
    dataPage1.length,
  );

  const firstCallIds = dataPage1.map((p) => p.id);
  const secondCallIds = dataPage1Second.map((p) => p.id);

  TestValidator.equals(
    "page 1 repeated call returns same ordered post ids",
    secondCallIds,
    firstCallIds,
  );
}
