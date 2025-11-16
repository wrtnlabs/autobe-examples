import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityStatusHistory";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityStatusHistory";

/**
 * Validate admin community status history search sorting and pagination.
 *
 * Business flow:
 *
 * 1. Register an adminUser.
 * 2. Register a memberUser.
 * 3. Login as memberUser and create a community.
 * 4. Login as adminUser.
 * 5. Call status history search for page=1, limit=10, sortBy=created_at,
 *    sortDirection=desc.
 * 6. If possible, call page=2 with the same sort options and ensure no overlap
 *    between pages.
 * 7. Call again with sortDirection=asc and confirm records are ordered from oldest
 *    to newest.
 *
 * Because the fixture does not expose an API to seed history entries directly,
 * the test adapts its assertions to the actual amount of data returned:
 *
 * - If there are fewer than 2 records or only 1 page, ordering and non-overlap
 *   checks that require multiple records/pages are skipped while still
 *   asserting type safety and basic pagination invariants.
 */
export async function test_api_admin_community_status_history_search_sorting_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register adminUser via join
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Register memberUser via join
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // 3. Explicitly login as memberUser to ensure member context
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/join-complete",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 4. Create a community as memberUser
  const communitySlug: string = `e2e-status-history-${RandomGenerator.alphaNumeric(
    12,
  )}`;

  const communityCreateBody = {
    slug: communitySlug,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  TestValidator.equals(
    "created community slug should match requested slug",
    createdCommunity.slug,
    communitySlug,
  );

  // 5. Login back as adminUser
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 6. Page 1, limit 10, sortBy=created_at, sortDirection=desc
  const requestPage1Desc = {
    page: 1,
    limit: 10,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformCommunityStatusHistory.IRequest;

  const page1Desc: IPageICommunityPlatformCommunityStatusHistory.ISummary =
    await api.functional.communityPlatform.adminUser.communities.statusHistories.index(
      connection,
      {
        communitySlug: createdCommunity.slug,
        body: requestPage1Desc,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityStatusHistory.ISummary>(
    page1Desc,
  );

  const page1Pagination = page1Desc.pagination;
  const page1Data = page1Desc.data;

  TestValidator.equals(
    "page 1 current index should be 1",
    page1Pagination.current,
    1,
  );

  TestValidator.equals("page 1 limit should be 10", page1Pagination.limit, 10);

  TestValidator.predicate(
    "page 1 data length must not exceed limit",
    page1Data.length <= page1Pagination.limit,
  );

  // Validate descending chronological order if at least two records
  if (page1Data.length >= 2) {
    for (let i = 1; i < page1Data.length; i++) {
      const prev = page1Data[i - 1];
      const curr = page1Data[i];

      const prevCreated: string =
        prev.createdAt !== undefined ? prev.createdAt : prev.created_at;
      const currCreated: string =
        curr.createdAt !== undefined ? curr.createdAt : curr.created_at;

      const prevTime = new Date(prevCreated).getTime();
      const currTime = new Date(currCreated).getTime();

      TestValidator.predicate(
        `descending order between index ${i - 1} and ${i}`,
        prevTime >= currTime,
      );
    }
  }

  // 7. Page 2 with same sort options when multiple pages exist
  if (page1Pagination.pages >= 2) {
    const requestPage2Desc = {
      page: 2,
      limit: 10,
      sortBy: "created_at",
      sortDirection: "desc",
    } satisfies ICommunityPlatformCommunityStatusHistory.IRequest;

    const page2Desc: IPageICommunityPlatformCommunityStatusHistory.ISummary =
      await api.functional.communityPlatform.adminUser.communities.statusHistories.index(
        connection,
        {
          communitySlug: createdCommunity.slug,
          body: requestPage2Desc,
        },
      );
    typia.assert<IPageICommunityPlatformCommunityStatusHistory.ISummary>(
      page2Desc,
    );

    TestValidator.equals(
      "page 2 current index should be 2",
      page2Desc.pagination.current,
      2,
    );

    const page2Data = page2Desc.data;

    TestValidator.predicate(
      "page 2 data length must not exceed limit",
      page2Data.length <= page2Desc.pagination.limit,
    );

    if (page1Data.length > 0 && page2Data.length > 0) {
      const page1Ids = page1Data.map((h) => h.id);
      const page2Ids = page2Data.map((h) => h.id);

      const allIds = [...page1Ids, ...page2Ids];
      const uniqueIds = new Set(allIds);

      TestValidator.equals(
        "no overlap between page 1 and page 2 ids",
        uniqueIds.size,
        allIds.length,
      );
    }
  }

  // 8. Ascending sort check on page 1
  const requestPage1Asc = {
    page: 1,
    limit: 10,
    sortBy: "created_at",
    sortDirection: "asc",
  } satisfies ICommunityPlatformCommunityStatusHistory.IRequest;

  const page1Asc: IPageICommunityPlatformCommunityStatusHistory.ISummary =
    await api.functional.communityPlatform.adminUser.communities.statusHistories.index(
      connection,
      {
        communitySlug: createdCommunity.slug,
        body: requestPage1Asc,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityStatusHistory.ISummary>(
    page1Asc,
  );

  const ascData = page1Asc.data;

  TestValidator.equals(
    "ascending page 1 limit should be 10",
    page1Asc.pagination.limit,
    10,
  );

  TestValidator.predicate(
    "ascending page 1 data length must not exceed limit",
    ascData.length <= page1Asc.pagination.limit,
  );

  if (ascData.length >= 2) {
    for (let i = 1; i < ascData.length; i++) {
      const prev = ascData[i - 1];
      const curr = ascData[i];

      const prevCreated: string =
        prev.createdAt !== undefined ? prev.createdAt : prev.created_at;
      const currCreated: string =
        curr.createdAt !== undefined ? curr.createdAt : curr.created_at;

      const prevTime = new Date(prevCreated).getTime();
      const currTime = new Date(currCreated).getTime();

      TestValidator.predicate(
        `ascending order between index ${i - 1} and ${i}`,
        prevTime <= currTime,
      );
    }
  }
}
