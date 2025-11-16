import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityTag";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityTag";

export async function test_api_community_tags_listing_with_pagination_and_search(
  connection: api.IConnection,
) {
  // 1. Actor setup: platform admin, member user, community moderator
  // NOTE: We must not rely on connection.headers mutation in tests, so we
  // create role-specific connections when needed using spread but without
  // manually manipulating headers afterwards.

  // Helper to clone base connection without touching headers after creation
  const createBareConnection = (): api.IConnection => ({
    ...connection,
    headers: { ...(connection.headers ?? {}) },
  });

  const platformAdminConn = createBareConnection();
  const memberUserConn = createBareConnection();
  const moderatorConn = createBareConnection();

  // 1-1. Platform admin join
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Pa55w0rd!",
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(platformAdminConn, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 1-2. Platform admin login (to ensure login flow works and headers are set)
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(platformAdminConn, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 1-3. Member user join
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Pa55w0rd!",
    ip: null,
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(memberUserConn, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 1-4. Member user login
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(memberUserConn, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  // 1-5. Community moderator join
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Pa55w0rd!",
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://mod.example.com/register",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(moderatorConn, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 1-6. Community moderator login
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: null,
    href: "https://mod.example.com/login",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoggedIn: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(moderatorConn, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoggedIn);

  // 2. Create a visibility level as platform admin
  const visibilityCode = `vis-${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      platformAdminConn,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Member user creates a community using the visibility level
  const communityIdentifier = `community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community for Tag Pagination",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      memberUserConn,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier matches request",
    community.identifier,
    communityIdentifier,
  );

  // 4. Create deterministic set of tags via community moderator
  const tagDefinitions: ICommunityPlatformCommunityTag.ICreate[] = [
    {
      label: "alpha-one",
      slug: "alpha-one",
      description: "alpha series tag one",
      isVisible: true,
      order: 1,
    },
    {
      label: "alpha-two",
      slug: "alpha-two",
      description: "alpha series tag two",
      isVisible: true,
      order: 2,
    },
    {
      label: "alpha-three",
      slug: "alpha-three",
      description: "alpha series tag three",
      isVisible: true,
      order: 3,
    },
    {
      label: "beta-one",
      slug: "beta-one",
      description: "beta series tag one",
      isVisible: true,
      order: 4,
    },
    {
      label: "gamma-one",
      slug: "gamma-one",
      description: "gamma series tag one",
      isVisible: true,
      order: 5,
    },
  ] satisfies ICommunityPlatformCommunityTag.ICreate[];

  const createdTags: ICommunityPlatformCommunityTag[] = [];
  for (const tagBody of tagDefinitions) {
    const tag: ICommunityPlatformCommunityTag =
      await api.functional.communityPlatform.communityModerator.communities.tags.create(
        moderatorConn,
        {
          communityIdentifier,
          body: tagBody,
        },
      );
    typia.assert(tag);
    createdTags.push(tag);
  }

  TestValidator.equals(
    "number of created tags matches definitions",
    createdTags.length,
    tagDefinitions.length,
  );

  // 4-bis. Optionally create a few more tags via platform admin to increase dataset
  const extraTagDefinitions: ICommunityPlatformCommunityTag.ICreate[] = [
    {
      label: "delta-one",
      slug: "delta-one",
      description: "delta series tag one",
      isVisible: true,
      order: 6,
    },
    {
      label: "epsilon-one",
      slug: "epsilon-one",
      description: "epsilon series tag one",
      isVisible: true,
      order: 7,
    },
  ] satisfies ICommunityPlatformCommunityTag.ICreate[];

  const extraTags: ICommunityPlatformCommunityTag[] = [];
  for (const tagBody of extraTagDefinitions) {
    const tag: ICommunityPlatformCommunityTag =
      await api.functional.communityPlatform.platformAdmin.communities.tags.create(
        platformAdminConn,
        {
          communityIdentifier,
          body: tagBody,
        },
      );
    typia.assert(tag);
    extraTags.push(tag);
  }

  const totalCreatedTags = createdTags.length + extraTags.length;

  // 5. Basic pagination test (page 1, limit 3, no search)
  const page1Limit: number & tags.Type<"int32"> & tags.Minimum<1> = 3;
  const requestPage1: ICommunityPlatformCommunityTag.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: page1Limit,
    search: undefined,
    order_by: undefined,
    order_direction: undefined,
  };

  const page1: IPageICommunityPlatformCommunityTag.ISummary =
    await api.functional.communityPlatform.communities.tags.index(connection, {
      communityIdentifier,
      body: requestPage1,
    });
  typia.assert(page1);

  const page1Pagination: IPage.IPagination = page1.pagination;
  typia.assert(page1Pagination);

  TestValidator.equals(
    "page1 limit equals requested limit",
    page1Pagination.limit,
    requestPage1.limit,
  );

  TestValidator.predicate(
    "page1 records should be at least number of created tags",
    page1Pagination.records >= totalCreatedTags,
  );

  TestValidator.predicate(
    "page1 pages should be positive when there are records",
    page1Pagination.records === 0
      ? page1Pagination.pages === 0
      : page1Pagination.pages > 0,
  );

  TestValidator.predicate(
    "page1 data length is within limit",
    page1.data.length > 0 && page1.data.length <= page1Pagination.limit,
  );

  // 6. Search filtering test using keyword "alpha"
  const searchKeyword = "alpha";
  const searchRequest: ICommunityPlatformCommunityTag.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: totalCreatedTags as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: searchKeyword,
    order_by: undefined,
    order_direction: undefined,
  };

  const searchPage: IPageICommunityPlatformCommunityTag.ISummary =
    await api.functional.communityPlatform.communities.tags.index(connection, {
      communityIdentifier,
      body: searchRequest,
    });
  typia.assert(searchPage);

  const searchPagination: IPage.IPagination = searchPage.pagination;
  typia.assert(searchPagination);

  const alphaTagIds = createdTags
    .filter((t) => t.label.toLowerCase().includes(searchKeyword))
    .map((t) => t.id);

  TestValidator.predicate(
    "search results records are at least number of alpha tags",
    searchPagination.records >= alphaTagIds.length,
  );

  TestValidator.predicate(
    "search results fit in a single page",
    searchPage.data.length <= searchPagination.limit,
  );

  TestValidator.predicate(
    "search results contain only tags with alpha in name/code/description",
    searchPage.data.every((summary) => {
      const lowerName = summary.name.toLowerCase();
      const lowerCode = summary.code.toLowerCase();
      const lowerDesc = (summary.description ?? "").toLowerCase();
      return (
        lowerName.includes(searchKeyword) ||
        lowerCode.includes(searchKeyword) ||
        lowerDesc.includes(searchKeyword)
      );
    }),
  );

  TestValidator.predicate(
    "search results do not include obviously non-matching tags (beta/gamma)",
    searchPage.data.every((summary) => {
      const lowerName = summary.name.toLowerCase();
      return !lowerName.startsWith("beta-") && !lowerName.startsWith("gamma-");
    }),
  );

  // 7. Later page index (page 2) when there are enough records
  if (page1Pagination.records > page1Pagination.limit) {
    const page2Request: ICommunityPlatformCommunityTag.IRequest = {
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: page1Pagination.limit as number &
        tags.Type<"int32"> &
        tags.Minimum<1>,
      search: undefined,
      order_by: undefined,
      order_direction: undefined,
    };

    const page2: IPageICommunityPlatformCommunityTag.ISummary =
      await api.functional.communityPlatform.communities.tags.index(
        connection,
        {
          communityIdentifier,
          body: page2Request,
        },
      );
    typia.assert(page2);

    TestValidator.predicate(
      "page2 data length within limit",
      page2.data.length <= page2.pagination.limit,
    );

    const combinedIds = [...page1.data, ...page2.data].map((s) => s.id);
    const uniqueIds = new Set(combinedIds);
    TestValidator.equals(
      "no duplicate tag ids across page1 and page2",
      uniqueIds.size,
      combinedIds.length,
    );
  }

  // 8. Public accessibility: call index with unauthenticated connection
  const publicConnection: api.IConnection = {
    host: connection.host,
    simulate: connection.simulate,
    options: connection.options,
    fetch: connection.fetch,
    logger: connection.logger,
    encryption: connection.encryption,
    headers: {},
  };

  const publicRequest: ICommunityPlatformCommunityTag.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: undefined,
    order_by: undefined,
    order_direction: undefined,
  };

  const publicPage: IPageICommunityPlatformCommunityTag.ISummary =
    await api.functional.communityPlatform.communities.tags.index(
      publicConnection,
      {
        communityIdentifier,
        body: publicRequest,
      },
    );
  typia.assert(publicPage);

  TestValidator.predicate(
    "public listing returns non-negative number of tags",
    publicPage.pagination.records >= 0 && publicPage.data.length >= 0,
  );
}
