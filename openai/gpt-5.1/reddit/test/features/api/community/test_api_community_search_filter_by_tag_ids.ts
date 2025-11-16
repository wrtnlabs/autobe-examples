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
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Verify that community search correctly filters by tag IDs.
 *
 * Business flow:
 *
 * 1. Platform admin joins and creates a visibility level with a unique code.
 * 2. Member user joins and creates several communities using that visibility
 *    level.
 * 3. Community moderator joins.
 * 4. Moderator creates tags in communities so that a particular tag is attached to
 *    multiple communities and other tags are attached to individual
 *    communities.
 * 5. Search endpoint PATCH /communityPlatform/communities/search is called with
 *    tagIds containing the shared tag ID.
 * 6. Assert that all returned communities are exactly those that have the shared
 *    tag and that pagination metadata is consistent.
 * 7. Perform another search using multiple tagIds (shared + a unique tag) to
 *    ensure that communities having any of those tags are returned (OR
 *    semantics), as long as the backend behaves that way.
 */
export async function test_api_community_search_filter_by_tag_ids(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (this also authenticates as platformAdmin)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Platform admin creates a visibility level
  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "created visibility level code matches",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Member user joins (this authenticates as memberUser)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.test.com` as string &
      tags.Format<"email">,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://community.app.local/join",
    referrer: "https://community.app.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 4. Create multiple communities as the member user
  const communityCount = 4;
  const communities: ICommunityPlatformCommunity[] = [];
  for (let i = 0; i < communityCount; i++) {
    const createBody = {
      identifier: `test-community-${RandomGenerator.alphabets(6)}-${i}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 8 }),
      visibilityLevelCode: visibilityCode,
      isNsfw: false,
      primaryTagIds: [],
    } satisfies ICommunityPlatformCommunity.ICreate;

    const community =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        { body: createBody },
      );
    typia.assert(community);
    communities.push(community);
  }

  TestValidator.equals(
    "expected number of communities created",
    communities.length,
    communityCount,
  );

  // 5. Community moderator joins (authenticate as communityModerator)
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@moderator.test.com` as string &
      tags.Format<"email">,
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://moderator.console.local/join",
    referrer: "https://moderator.console.local/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;
  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // 6. Moderator creates tags on communities.
  // Choose first two communities to share a common tag; third gets a distinct tag; fourth remains untagged.
  const sharedTagLabel = `shared-tag-${RandomGenerator.alphabets(5)}`;

  const sharedTagCommunityA = communities[0];
  const sharedTagCommunityB = communities[1];
  const distinctTagCommunity = communities[2];

  // 6-1. Create shared tag on community A
  const sharedTagA =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: sharedTagCommunityA.identifier,
        body: {
          label: sharedTagLabel,
          slug: `${sharedTagLabel}-slug-a`,
          description: RandomGenerator.paragraph({ sentences: 4 }),
          isVisible: true,
          order: 1,
        } satisfies ICommunityPlatformCommunityTag.ICreate,
      },
    );
  typia.assert(sharedTagA);

  // 6-2. Create shared tag on community B (same label/slug pattern but independent record)
  const sharedTagB =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: sharedTagCommunityB.identifier,
        body: {
          label: sharedTagLabel,
          slug: `${sharedTagLabel}-slug-b`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          isVisible: true,
          order: 1,
        } satisfies ICommunityPlatformCommunityTag.ICreate,
      },
    );
  typia.assert(sharedTagB);

  // 6-3. Create a distinct tag on community C
  const distinctTagLabel = `distinct-tag-${RandomGenerator.alphabets(5)}`;
  const distinctTagC =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: distinctTagCommunity.identifier,
        body: {
          label: distinctTagLabel,
          slug: `${distinctTagLabel}-slug`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          isVisible: true,
          order: 2,
        } satisfies ICommunityPlatformCommunityTag.ICreate,
      },
    );
  typia.assert(distinctTagC);

  // 7. Search communities filtering by tagIds using one of the shared tag IDs.
  // Because tagIds are defined as UUIDs for tag identifiers, but the ICommunityPlatformCommunityTag.id
  // is a plain string (no explicit uuid tag), we still treat it as identifier to pass into tagIds.

  const searchBySharedTagBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    search: undefined,
    visibilityLevelCodes: [visibilityCode],
    tagIds: [sharedTagA.id as string & tags.Format<"uuid">],
    createdFrom: undefined,
    createdTo: undefined,
    minMemberCount: undefined,
    maxMemberCount: undefined,
    includeHidden: undefined,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const searchBySharedTagResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.search.index(
      connection,
      {
        body: searchBySharedTagBody,
      },
    );
  typia.assert(searchBySharedTagResult);

  const sharedTagCommunities = searchBySharedTagResult.data;

  // At least one community with the shared tag should be returned
  TestValidator.predicate(
    "search by shared tag returns at least one community",
    sharedTagCommunities.length > 0,
  );

  // Every returned community must be one of the communities we tagged with the shared tag
  const allowedIds = new Set([sharedTagCommunityA.id, sharedTagCommunityB.id]);

  for (const summary of sharedTagCommunities) {
    TestValidator.predicate(
      "every community in shared-tag search must be one of tagged communities",
      allowedIds.has(summary.id),
    );
  }

  // Pagination metadata should report records count equal to number of returned communities
  TestValidator.equals(
    "pagination.records equals data length for shared-tag search (within this test scope)",
    searchBySharedTagResult.pagination.records,
    sharedTagCommunities.length,
  );

  // 8. Search with multiple tagIds (sharedTagA + distinctTagC) to check OR semantics
  const searchByMultipleTagsBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    search: undefined,
    visibilityLevelCodes: [visibilityCode],
    tagIds: [
      sharedTagA.id as string & tags.Format<"uuid">,
      distinctTagC.id as string & tags.Format<"uuid">,
    ],
    createdFrom: undefined,
    createdTo: undefined,
    minMemberCount: undefined,
    maxMemberCount: undefined,
    includeHidden: undefined,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const searchByMultipleTagsResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.search.index(
      connection,
      {
        body: searchByMultipleTagsBody,
      },
    );
  typia.assert(searchByMultipleTagsResult);

  const multipleTagCommunities = searchByMultipleTagsResult.data;

  // OR semantics expectation (any community having at least one of the tags is eligible).
  // Within controlled test data, expected eligible communities are: sharedTagCommunityA, sharedTagCommunityB, distinctTagCommunity.
  const expectedOrIds = new Set([
    sharedTagCommunityA.id,
    sharedTagCommunityB.id,
    distinctTagCommunity.id,
  ]);

  for (const summary of multipleTagCommunities) {
    TestValidator.predicate(
      "multi-tag search should only return communities with at least one requested tag in this dataset",
      expectedOrIds.has(summary.id),
    );
  }

  // At least the communities with sharedTagA and distinctTagC should appear.
  const hasCommunityA = multipleTagCommunities.some(
    (c) => c.id === sharedTagCommunityA.id,
  );
  const hasCommunityC = multipleTagCommunities.some(
    (c) => c.id === distinctTagCommunity.id,
  );

  TestValidator.predicate(
    "multi-tag search should include community A (shared tag)",
    hasCommunityA,
  );
  TestValidator.predicate(
    "multi-tag search should include community C (distinct tag)",
    hasCommunityC,
  );
}
