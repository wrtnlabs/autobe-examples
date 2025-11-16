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

export async function test_api_community_search_basic_public_discovery(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and creates a public visibility level
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPassw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: "Publicly discoverable community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibility);

  // 2. Member user joins and creates multiple communities
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.example.com`,
    password: "MemberPassw0rd!",
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const createdCommunities: ICommunityPlatformCommunity[] =
    await ArrayUtil.asyncRepeat(5, async (index) => {
      const createBody = {
        identifier: `community_${index}_${RandomGenerator.alphabets(5)}`,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        visibilityLevelCode: visibility.code,
        isNsfw: index % 2 === 0,
        primaryTagIds: [],
      } satisfies ICommunityPlatformCommunity.ICreate;

      const community: ICommunityPlatformCommunity =
        await api.functional.communityPlatform.memberUser.communities.create(
          connection,
          { body: createBody },
        );
      typia.assert(community);
      return community;
    });

  // 3. Anonymous caller: clone connection without headers (no Authorization)
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const page = 1;
  const limit = 20;

  const requestBody = {
    page,
    limit,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const pageResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(
      anonymousConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current equals requested page",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit equals requested limit",
    pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "pagination.records is at least the number of returned summaries",
    pagination.records >= pageResult.data.length,
  );

  if (pagination.limit > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pagination.pages matches ceil(records/limit)",
      pagination.pages,
      expectedPages,
    );
  }

  // 6. Confirm returned summaries include created communities and fields match expectations
  for (const created of createdCommunities) {
    const summary = pageResult.data.find((s) => s.id === created.id);

    if (!summary) continue; // community may appear on a different page if dataset is larger

    TestValidator.equals(
      "summary.id matches created community id",
      summary.id,
      created.id,
    );

    TestValidator.equals(
      "summary.slug matches created community identifier",
      summary.slug,
      created.identifier,
    );

    TestValidator.equals(
      "summary.name matches created community title",
      summary.name,
      created.title,
    );

    TestValidator.equals(
      "summary.visibilityLevel.code matches created visibility code",
      summary.visibilityLevel.code,
      created.visibilityLevel.code,
    );

    TestValidator.equals(
      "summary.visibilityLevel.name matches created visibility name",
      summary.visibilityLevel.name,
      created.visibilityLevel.name,
    );
  }

  // 7. Second index call with different pagination to assert consistency
  const secondPage = 2;
  const secondRequestBody = {
    page: secondPage,
    limit,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const secondPageResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(
      anonymousConnection,
      {
        body: secondRequestBody,
      },
    );
  typia.assert(secondPageResult);

  const secondPagination: IPage.IPagination = secondPageResult.pagination;
  typia.assert(secondPagination);

  TestValidator.equals(
    "second page pagination.current equals requested page",
    secondPagination.current,
    secondRequestBody.page,
  );
  TestValidator.equals(
    "second page pagination.limit equals requested limit",
    secondPagination.limit,
    limit,
  );

  TestValidator.predicate(
    "second page pagination.records is at least length of second page data",
    secondPagination.records >= secondPageResult.data.length,
  );
}
