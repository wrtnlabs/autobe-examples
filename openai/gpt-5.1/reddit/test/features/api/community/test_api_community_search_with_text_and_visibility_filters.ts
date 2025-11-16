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
 * Verify community search supports free-text search and visibility-level
 * filtering.
 *
 * Business goal: Ensure that the anonymous discovery endpoint PATCH
 * /communityPlatform/communities can filter communities by a free-text keyword
 * and by visibility level code, returning only matching communities in a
 * paginated response. The test sets up visibility levels and communities, then
 * performs anonymous search calls and validates that the results obey the
 * filters and pagination contract.
 *
 * High-level flow:
 *
 * 1. Join a platform admin and remain authenticated as platformAdmin.
 * 2. Create two visibility levels, e.g. PUBLIC and RESTRICTED.
 * 3. Join a memberUser and authenticate as that user.
 * 4. Create several communities:
 *
 *    - Some with a distinctive keyword in identifier/title/description and PUBLIC
 *         visibility.
 *    - Some without keyword and/or with RESTRICTED visibility.
 * 5. Switch to an anonymous connection (no Authorization header).
 * 6. Call communityPlatform.communities.index with search and visibilityLevelCodes
 *    targeting PUBLIC communities containing the keyword.
 * 7. Validate:
 *
 *    - Response type via typia.assert
 *    - Pagination metadata is coherent with the request (page, limit)
 *    - All returned items have visibilityLevel.code equal to the PUBLIC code
 *    - Returned items are a subset of the created PUBLIC+keyword communities, and
 *         none from RESTRICTED or without keyword appear.
 * 8. Optionally, call again with explicit sortBy/sortDirection to ensure that
 *    specifying sort options does not break the filters and the response is
 *    structurally valid.
 */
export async function test_api_community_search_with_text_and_visibility_filters(
  connection: api.IConnection,
) {
  // ---------- 1. Platform admin joins ----------
  const platformAdminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.console.test/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // ---------- 2. Create visibility levels (PUBLIC, RESTRICTED) ----------
  const publicCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const restrictedCode = `restricted_${RandomGenerator.alphaNumeric(6)}`;

  const publicVisibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: publicCode,
          name: `Public ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(publicVisibilityLevel);

  const restrictedVisibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: restrictedCode,
          name: `Restricted ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(restrictedVisibilityLevel);

  // ---------- 3. Member user joins & logs in ----------
  const memberJoinBody = {
    username: `member_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@member.test` as string &
      tags.Format<"email">,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://app.client.test/join" as string & tags.Format<"uri">,
    referrer: "https://app.client.test/home" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Call login explicitly to exercise login path as well (even though join sets token).
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.client.test/login" as string & tags.Format<"uri">,
    referrer: "https://app.client.test/home" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // ---------- 4. Create communities with and without keyword and visibility ----------
  const keyword = "kotlin";

  const buildIdentifier = (base: string, withKeyword: boolean): string => {
    return withKeyword
      ? `${base}-${keyword}-${RandomGenerator.alphaNumeric(4)}`
      : `${base}-${RandomGenerator.alphaNumeric(4)}`;
  };

  const publicWithKeyword: ICommunityPlatformCommunity[] = [];
  const publicWithoutKeyword: ICommunityPlatformCommunity[] = [];
  const restrictedWithKeyword: ICommunityPlatformCommunity[] = [];
  const restrictedWithoutKeyword: ICommunityPlatformCommunity[] = [];

  // PUBLIC communities containing the keyword
  const publicWithKeywordCount = 4;
  for (let i = 0; i < publicWithKeywordCount; i++) {
    const createBody = {
      identifier: buildIdentifier("pub-key", true),
      title: `Public Kotlin Community ${i}`,
      description: RandomGenerator.paragraph({ sentences: 5 }),
      visibilityLevelCode: publicCode,
      isNsfw: false,
      primaryTagIds: undefined,
    } satisfies ICommunityPlatformCommunity.ICreate;

    const community: ICommunityPlatformCommunity =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        { body: createBody },
      );
    typia.assert(community);
    publicWithKeyword.push(community);
  }

  // PUBLIC communities without the keyword
  const publicWithoutKeywordCount = 3;
  for (let i = 0; i < publicWithoutKeywordCount; i++) {
    const createBody = {
      identifier: buildIdentifier("pub-nokey", false),
      title: `Public Other Community ${i}`,
      description: RandomGenerator.paragraph({ sentences: 4 }),
      visibilityLevelCode: publicCode,
      isNsfw: false,
      primaryTagIds: undefined,
    } satisfies ICommunityPlatformCommunity.ICreate;

    const community: ICommunityPlatformCommunity =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        { body: createBody },
      );
    typia.assert(community);
    publicWithoutKeyword.push(community);
  }

  // RESTRICTED communities with keyword
  const restrictedWithKeywordCount = 2;
  for (let i = 0; i < restrictedWithKeywordCount; i++) {
    const createBody = {
      identifier: buildIdentifier("res-key", true),
      title: `Restricted Kotlin Community ${i}`,
      description: RandomGenerator.paragraph({ sentences: 4 }),
      visibilityLevelCode: restrictedCode,
      isNsfw: false,
      primaryTagIds: undefined,
    } satisfies ICommunityPlatformCommunity.ICreate;

    const community: ICommunityPlatformCommunity =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        { body: createBody },
      );
    typia.assert(community);
    restrictedWithKeyword.push(community);
  }

  // RESTRICTED communities without keyword
  const restrictedWithoutKeywordCount = 2;
  for (let i = 0; i < restrictedWithoutKeywordCount; i++) {
    const createBody = {
      identifier: buildIdentifier("res-nokey", false),
      title: `Restricted Other Community ${i}`,
      description: RandomGenerator.paragraph({ sentences: 4 }),
      visibilityLevelCode: restrictedCode,
      isNsfw: false,
      primaryTagIds: undefined,
    } satisfies ICommunityPlatformCommunity.ICreate;

    const community: ICommunityPlatformCommunity =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        { body: createBody },
      );
    typia.assert(community);
    restrictedWithoutKeyword.push(community);
  }

  // ---------- 5. Build an anonymous connection (no Authorization header) ----------
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // ---------- 6. Call search endpoint with keyword + PUBLIC visibility ----------
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  const searchRequest: ICommunityPlatformCommunity.IRequest = {
    page,
    limit,
    search: keyword,
    visibilityLevelCodes: [publicCode],
    tagIds: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    minMemberCount: undefined,
    maxMemberCount: undefined,
    includeHidden: false,
    sortBy: undefined,
    sortDirection: undefined,
  };

  const searchResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(
      anonymousConnection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResult);

  // ---------- 7. Validate pagination metadata ----------
  const pagination = searchResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.equals(
    "pagination current page should match requested page",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "pagination limit should be > 0",
    pagination.limit > 0,
  );

  // ---------- 8. Validate filtering by visibility and keyword ----------
  const summaries = searchResult.data;

  for (const summary of summaries) {
    // All results must be PUBLIC visibility
    TestValidator.equals(
      "result visibilityLevel.code must equal requested public code",
      summary.visibilityLevel.code,
      publicCode,
    );

    // Name or slug should contain the keyword (case-insensitive) because we
    // constructed identifiers/titles with keyword when we wanted them to be found.
    const haystack = `${summary.name} ${summary.slug}`.toLowerCase();
    TestValidator.predicate(
      "summary name or slug should contain keyword",
      haystack.includes(keyword.toLowerCase()),
    );
  }

  // Ensure that none of the known non-public or non-keyword communities
  // appear in the results (by id comparison).
  const nonExpectedIds: string[] = [
    ...publicWithoutKeyword.map((c) => c.id),
    ...restrictedWithKeyword.map((c) => c.id),
    ...restrictedWithoutKeyword.map((c) => c.id),
  ];
  const resultIds = summaries.map((s) => s.id);

  for (const forbiddenId of nonExpectedIds) {
    TestValidator.predicate(
      "search results must not contain communities without keyword or with non-public visibility",
      resultIds.includes(forbiddenId) === false,
    );
  }

  // ---------- 9. Optional: Call again with explicit sortBy/sortDirection ----------
  const sortedRequest: ICommunityPlatformCommunity.IRequest = {
    ...searchRequest,
    sortBy: "createdAt",
    sortDirection: "desc",
  };

  const sortedResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(
      anonymousConnection,
      {
        body: sortedRequest,
      },
    );
  typia.assert(sortedResult);

  // Ensure that applying sort options still respects the same filters by
  // checking visibilityLevel.code for each item in the sorted result.
  for (const summary of sortedResult.data) {
    TestValidator.equals(
      "sorted result visibilityLevel.code must equal requested public code",
      summary.visibilityLevel.code,
      publicCode,
    );
  }
}
