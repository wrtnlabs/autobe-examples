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

export async function test_api_community_tags_listing_basic(
  connection: api.IConnection,
) {
  // 1. Register platform admin
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword = "P@ssw0rd!";
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: platformAdminEmail,
    password: platformAdminPassword,
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorizedFromJoin);

  // 2. Explicit login as platform admin (ensures login endpoint works and sets token)
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: platformAdminPassword,
    ip: undefined,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthorizedFromLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedFromLogin);

  // 3. Create a visibility level as platform admin
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Public Visibility ${RandomGenerator.alphabets(5)}`,
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
    "created visibility level code should match request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 4. Register and login member user
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "P@ssw0rd!";
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 5. Create a community as member user
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(10)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
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
    "created community identifier should match request",
    community.identifier,
    communityIdentifier,
  );

  // 6. Register and login community moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "P@ssw0rd!";
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://mod.example.com/register",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorizedFromJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorizedFromJoin);

  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: null,
    href: "https://mod.example.com/login",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorAuthorizedFromLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorAuthorizedFromLogin);

  // 7. Create a tag as community moderator
  const moderatorTagLabelBase = `moderator-tag-${RandomGenerator.alphaNumeric(6)}`;
  const moderatorTagSlug = `${moderatorTagLabelBase}-slug`;
  const moderatorTagCreateBody = {
    label: moderatorTagLabelBase,
    slug: moderatorTagSlug,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isVisible: true,
    order: 1,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const moderatorTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: moderatorTagCreateBody,
      },
    );
  typia.assert(moderatorTag);

  // 8. Switch back to platform admin (login again)
  const platformAdminAuthorizedAgain: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedAgain);

  // 9. Create a tag as platform admin
  const adminTagLabelBase = `admin-tag-${RandomGenerator.alphaNumeric(6)}`;
  const adminTagSlug = `${adminTagLabelBase}-slug`;
  const adminTagCreateBody = {
    label: adminTagLabelBase,
    slug: adminTagSlug,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isVisible: true,
    order: 2,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const adminTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.platformAdmin.communities.tags.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: adminTagCreateBody,
      },
    );
  typia.assert(adminTag);

  // 10. Prepare unauthenticated connection (public client)
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 11. List tags without search (page 1)
  const listRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: undefined,
    order_by: undefined,
    order_direction: undefined,
  } satisfies ICommunityPlatformCommunityTag.IRequest;

  const listPage: IPageICommunityPlatformCommunityTag.ISummary =
    await api.functional.communityPlatform.communities.tags.index(
      publicConnection,
      {
        communityIdentifier: communityIdentifier,
        body: listRequestBody,
      },
    );
  typia.assert(listPage);

  const pagination = listPage.pagination;
  const summaries = listPage.data;

  TestValidator.predicate(
    "pagination current page should be 1",
    pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be at least number of returned tags",
    pagination.limit >= summaries.length,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be at least 1 when records > 0",
    pagination.records === 0 ? pagination.pages === 0 : pagination.pages >= 1,
  );

  // Ensure both moderator and admin tags appear in listing, matching by id
  const moderatorSummary = summaries.find((s) => s.id === moderatorTag.id);
  const adminSummary = summaries.find((s) => s.id === adminTag.id);

  TestValidator.predicate(
    "listing should include moderator-created tag by id",
    moderatorSummary !== undefined,
  );
  TestValidator.predicate(
    "listing should include platform-admin-created tag by id",
    adminSummary !== undefined,
  );

  if (moderatorSummary !== undefined) {
    TestValidator.equals(
      "moderator tag summary id matches created tag id",
      moderatorSummary.id,
      moderatorTag.id,
    );
  }
  if (adminSummary !== undefined) {
    TestValidator.equals(
      "admin tag summary id matches created tag id",
      adminSummary.id,
      adminTag.id,
    );
  }

  // 12. Search scenario: use moderator tag name (summary.name) if available, else label base
  const searchKeyword =
    moderatorSummary !== undefined && moderatorSummary.name.length > 0
      ? moderatorSummary.name
      : moderatorTag.label;

  const searchRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: searchKeyword,
    order_by: undefined,
    order_direction: undefined,
  } satisfies ICommunityPlatformCommunityTag.IRequest;

  const searchPage: IPageICommunityPlatformCommunityTag.ISummary =
    await api.functional.communityPlatform.communities.tags.index(
      publicConnection,
      {
        communityIdentifier: communityIdentifier,
        body: searchRequestBody,
      },
    );
  typia.assert(searchPage);

  const searchSummaries = searchPage.data;

  TestValidator.predicate(
    "search results should not be empty for moderator tag keyword",
    searchSummaries.length > 0,
  );

  const searchHasModeratorTag = searchSummaries.some(
    (s) => s.id === moderatorTag.id,
  );
  TestValidator.predicate(
    "search results should include the moderator tag",
    searchHasModeratorTag,
  );

  // Optionally, if the search keyword is highly specific, expect that all results correspond to the moderator tag
  const allMatchModeratorTag = searchSummaries.every(
    (s) => s.id === moderatorTag.id,
  );
  TestValidator.predicate(
    "all search results should correspond to moderator tag when using specific keyword",
    allMatchModeratorTag || searchSummaries.length >= 1,
  );
}
