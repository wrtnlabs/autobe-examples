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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

export async function test_api_community_search_excluding_hidden_communities_by_default(
  connection: api.IConnection,
) {
  // 1. Prepare a unique visibility level as platformAdmin so that our test
  //    communities share a common, known visibility code.
  const adminJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: `${RandomGenerator.alphabets(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      ip: undefined,
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/landing",
    } satisfies ICommunityPlatformPlatformadmin.IJoin,
  });
  typia.assert(adminJoin);

  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: `Visibility ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 2. Register and login as a memberUser who will create communities.
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: `${RandomGenerator.alphabets(8)}@member.com`,
        password: memberPassword,
        ip: undefined,
        href: "https://app.example.com/signup",
        referrer: "https://app.example.com/home",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberJoin.email,
        password: memberPassword,
        ip: undefined,
        href: "https://app.example.com/login",
        referrer: "https://app.example.com/home",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberLogin);

  // 3. Create two communities with the same visibility level code.
  const visibleIdentifier = `visible_${RandomGenerator.alphaNumeric(6)}`;
  const hiddenIdentifier = `hidden_${RandomGenerator.alphaNumeric(6)}`;

  const visibleCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: visibleIdentifier,
          title: `Visible ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 8 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(visibleCommunity);

  const hiddenCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: hiddenIdentifier,
          title: `Hidden ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 4 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(hiddenCommunity);

  // NOTE:
  // We do not have a direct API to mark a community as is_removed/is_archived,
  // so we treat both as "created" and rely on platform-level filters. The
  // purpose here is to verify default behaviour of includeHidden in search,
  // but technically we cannot toggle is_removed in this scenario; therefore,
  // we focus on verifying that including or omitting includeHidden does not
  // break pagination and that standard visible communities are discoverable.

  // 4. Invoke PATCH /communityPlatform/communities WITHOUT includeHidden.
  const searchWithoutHidden: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 50 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        search: undefined,
        visibilityLevelCodes: [visibilityCode],
        tagIds: undefined,
        createdFrom: undefined,
        createdTo: undefined,
        minMemberCount: undefined,
        maxMemberCount: undefined,
        includeHidden: undefined,
        sortBy: undefined,
        sortDirection: undefined,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(searchWithoutHidden);

  // Basic pagination consistency checks for the first search.
  const pagination1 = searchWithoutHidden.pagination;
  typia.assert<IPage.IPagination>(pagination1);

  TestValidator.predicate(
    "first search current page should be >= 1",
    pagination1.current >= 1,
  );
  TestValidator.predicate(
    "first search limit should be >= data length",
    pagination1.limit >= searchWithoutHidden.data.length,
  );
  TestValidator.predicate(
    "first search records should be >= data length",
    pagination1.records >= searchWithoutHidden.data.length,
  );

  // Confirm that the visible community appears in the results.
  const foundVisibleInDefault = searchWithoutHidden.data.some(
    (summary) => summary.id === visibleCommunity.id,
  );
  TestValidator.predicate(
    "visible community should appear in default search (includeHidden omitted)",
    foundVisibleInDefault,
  );

  // 5. Invoke PATCH /communityPlatform/communities WITH includeHidden: true.
  const searchWithHidden: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 50 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        search: undefined,
        visibilityLevelCodes: [visibilityCode],
        tagIds: undefined,
        createdFrom: undefined,
        createdTo: undefined,
        minMemberCount: undefined,
        maxMemberCount: undefined,
        includeHidden: true,
        sortBy: undefined,
        sortDirection: undefined,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(searchWithHidden);

  const pagination2 = searchWithHidden.pagination;
  typia.assert<IPage.IPagination>(pagination2);

  // 6. Ensure pagination is internally consistent in the second call and
  //    that the visible community is still present.
  TestValidator.predicate(
    "second search current page should be >= 1",
    pagination2.current >= 1,
  );
  TestValidator.predicate(
    "second search limit should be >= data length",
    pagination2.limit >= searchWithHidden.data.length,
  );
  TestValidator.predicate(
    "second search records should be >= data length",
    pagination2.records >= searchWithHidden.data.length,
  );

  const foundVisibleInIncludeHidden = searchWithHidden.data.some(
    (summary) => summary.id === visibleCommunity.id,
  );
  TestValidator.predicate(
    "visible community should appear when includeHidden is true",
    foundVisibleInIncludeHidden,
  );

  // 7. Compare pagination records between the two calls. When includeHidden is
  //    true, record count should be the same or greater than without it.
  TestValidator.predicate(
    "records with includeHidden should be >= records without includeHidden",
    pagination2.records >= pagination1.records,
  );

  // 8. Because we cannot directly toggle is_removed or is_archived using
  //    available APIs, we do not assert that the hiddenCommunity is excluded or
  //    included. Instead, we ensure the behaviour around includeHidden does not
  //    break visibility of normal communities and yields consistent pagination
  //    semantics.
}
