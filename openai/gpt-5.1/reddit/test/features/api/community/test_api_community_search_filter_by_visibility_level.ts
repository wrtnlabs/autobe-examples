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

/**
 * Validate that community search can filter by visibility level.
 *
 * Business goal: Ensure that the public discovery search endpoint only returns
 * communities whose visibility level codes match the requested filter values,
 * and that pagination metadata reflects the actual number of matching
 * communities.
 *
 * Scenario steps:
 *
 * 1. Create a platform admin and log in.
 * 2. As platform admin, create two visibility levels with codes "public" and
 *    "private".
 * 3. Create a member user and log in.
 * 4. As member user, create multiple communities with visibilityLevelCode set to
 *    either "public" or "private".
 * 5. From an anonymous connection (no Authorization header), call the search API
 *    with visibilityLevelCodes: ["public"] and validate that only public
 *    communities are returned and private ones are excluded.
 * 6. Call the search API again with visibilityLevelCodes: ["private"] and validate
 *    that only private communities are returned and public ones are excluded.
 * 7. Validate that pagination.records equals the number of created communities
 *    matching the filter, and that pages is computed correctly for the selected
 *    limit.
 */
export async function test_api_community_search_filter_by_visibility_level(
  connection: api.IConnection,
) {
  // 1. Platform admin registration (join) to bootstrap admin actor
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create two visibility levels: public and private
  const publicVisibilityCode = "public";
  const privateVisibilityCode = "private";

  const publicVisibilityBody = {
    code: publicVisibilityCode,
    name: "Public",
    description: "Publicly visible communities",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const privateVisibilityBody = {
    code: privateVisibilityCode,
    name: "Private",
    description: "Private communities, not generally discoverable",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const publicVisibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: publicVisibilityBody },
    );
  typia.assert(publicVisibility);

  const privateVisibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: privateVisibilityBody },
    );
  typia.assert(privateVisibility);

  // 3. Member user registration (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Create multiple communities with different visibility levels
  const publicCommunityCount = 3;
  const privateCommunityCount = 2;

  const publicCommunities: ICommunityPlatformCommunity[] = [];
  const privateCommunities: ICommunityPlatformCommunity[] = [];

  for (let i = 0; i < publicCommunityCount; i++) {
    const createBody = {
      identifier: `${RandomGenerator.alphabets(8)}-pub-${i}`,
      title: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
      visibilityLevelCode: publicVisibilityCode,
      isNsfw: false,
      primaryTagIds: [],
    } satisfies ICommunityPlatformCommunity.ICreate;

    const community =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        { body: createBody },
      );
    typia.assert(community);
    publicCommunities.push(community);
  }

  for (let i = 0; i < privateCommunityCount; i++) {
    const createBody = {
      identifier: `${RandomGenerator.alphabets(8)}-pri-${i}`,
      title: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
      visibilityLevelCode: privateVisibilityCode,
      isNsfw: true,
      primaryTagIds: [],
    } satisfies ICommunityPlatformCommunity.ICreate;

    const community =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        { body: createBody },
      );
    typia.assert(community);
    privateCommunities.push(community);
  }

  // Prepare an anonymous connection (no Authorization header)
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const pageLimit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  // 5. Search only public communities
  const publicSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: pageLimit,
    visibilityLevelCodes: [publicVisibilityCode],
  } satisfies ICommunityPlatformCommunity.IRequest;

  const publicSearchResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.search.index(
      anonymousConnection,
      { body: publicSearchBody },
    );
  typia.assert(publicSearchResult);

  // Assertions for public search
  TestValidator.equals(
    "public search: records count should equal created public communities",
    publicSearchResult.pagination.records,
    publicCommunityCount,
  );

  TestValidator.predicate(
    "public search: pages should be at least 1 when there are results",
    publicSearchResult.pagination.pages >= 1,
  );

  for (const summary of publicSearchResult.data) {
    typia.assert(summary);
    TestValidator.equals(
      "public search: every result must have public visibility",
      summary.visibilityLevel.code,
      publicVisibilityCode,
    );
  }

  const privateIds = new Set(privateCommunities.map((c) => c.id));
  for (const summary of publicSearchResult.data) {
    TestValidator.predicate(
      "public search: private community ids must not appear",
      privateIds.has(summary.id) === false,
    );
  }

  // 6. Search only private communities
  const privateSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: pageLimit,
    visibilityLevelCodes: [privateVisibilityCode],
  } satisfies ICommunityPlatformCommunity.IRequest;

  const privateSearchResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.search.index(
      anonymousConnection,
      { body: privateSearchBody },
    );
  typia.assert(privateSearchResult);

  TestValidator.equals(
    "private search: records count should equal created private communities",
    privateSearchResult.pagination.records,
    privateCommunityCount,
  );

  TestValidator.predicate(
    "private search: pages should be at least 1 when there are results",
    privateSearchResult.pagination.pages >= 1,
  );

  for (const summary of privateSearchResult.data) {
    typia.assert(summary);
    TestValidator.equals(
      "private search: every result must have private visibility",
      summary.visibilityLevel.code,
      privateVisibilityCode,
    );
  }

  const publicIds = new Set(publicCommunities.map((c) => c.id));
  for (const summary of privateSearchResult.data) {
    TestValidator.predicate(
      "private search: public community ids must not appear",
      publicIds.has(summary.id) === false,
    );
  }

  // 7. Optional: combined search for both visibility levels
  const combinedSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: pageLimit,
    visibilityLevelCodes: [publicVisibilityCode, privateVisibilityCode],
  } satisfies ICommunityPlatformCommunity.IRequest;

  const combinedSearchResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.search.index(
      anonymousConnection,
      { body: combinedSearchBody },
    );
  typia.assert(combinedSearchResult);

  const totalCreated = publicCommunityCount + privateCommunityCount;
  TestValidator.equals(
    "combined search: records should equal total created communities",
    combinedSearchResult.pagination.records,
    totalCreated,
  );

  for (const summary of combinedSearchResult.data) {
    TestValidator.predicate(
      "combined search: visibility level code should be either public or private",
      summary.visibilityLevel.code === publicVisibilityCode ||
        summary.visibilityLevel.code === privateVisibilityCode,
    );
  }
}
