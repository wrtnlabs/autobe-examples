import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReportTarget";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostReport";

/**
 * Validate moderation report search pagination and sorting behavior.
 *
 * Business goal: Ensure that the admin-only moderation report search endpoint
 * `/communityPlatform/adminUser/moderation/search/reports` correctly handles
 * explicit pagination and sorting by `created_at` in descending order. The test
 * creates a realistic dataset of post reports filed by a memberUser, then has
 * an adminUser query them with a small page size to exercise multi-page
 * behavior.
 *
 * Steps:
 *
 * 1. Register and authenticate a memberUser (reporter and content author).
 * 2. Register and authenticate an adminUser (moderation actor).
 * 3. As memberUser, create a community and then join it.
 * 4. As memberUser, create multiple posts in the community.
 * 5. As memberUser, create one post report per post so that total reports exceed a
 *    single pageSize (e.g., 7 reports for pageSize=3).
 * 6. Switch authentication to the adminUser.
 * 7. Call moderation search with page=1, pageSize=3, sortBy="created_at",
 *    sortDirection="desc" and capture the response.
 * 8. Call again with page=2, same sort parameters, capture the response.
 * 9. Assert pagination metadata correctness (current, limit, records, pages) and
 *    consistency across pages.
 * 10. Assert that report IDs on page 1 and page 2 do not overlap.
 * 11. Assert sorting within each page is non-increasing by created_at.
 * 12. Concatenate page1+page2 and assert combined ordering is still non-increasing
 *     by created_at and its length equals `Math.min(6, records)`.
 * 13. Request a page beyond the last page and assert the endpoint returns an empty
 *     data array with the same pagination metadata for records and pages.
 */
export async function test_api_moderation_report_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register memberUser
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Make sure memberUser is the active actor for subsequent calls
  const memberLoginBody = {
    identifier: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 4. Create a community as the memberUser
  const communitySlug = `community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    slug: communitySlug,
    name: RandomGenerator.name(2),
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

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. Join the community (membership) as the same memberUser
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 6. Create multiple posts in the community
  const POST_COUNT = 7; // ensures > pageSize (3)
  const posts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(
    POST_COUNT,
    async (index) => {
      const body = {
        communityId: community.id,
        communityCode: community.slug,
        title: `Post #${index + 1} - ${RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        })}`,
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 3,
          wordMax: 8,
        }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate;

      const post: ICommunityPlatformPost =
        await api.functional.communityPlatform.memberUser.posts.create(
          connection,
          { body },
        );
      typia.assert(post);
      return post;
    },
  );

  // 7. Create one post report per post as the same memberUser
  const reports: ICommunityPlatformPostReport[] = [];
  for (const post of posts) {
    const reportBody = {
      post_id: post.id,
      reason_category: RandomGenerator.pick([
        "spam",
        "harassment",
        "hate",
        "other",
      ] as const),
      reason_detail: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 8,
      }),
      severity: RandomGenerator.pick(["low", "medium", "high"] as const),
    } satisfies ICommunityPlatformPostReport.ICreate;

    const report: ICommunityPlatformPostReport =
      await api.functional.communityPlatform.memberUser.postReports.create(
        connection,
        { body: reportBody },
      );
    typia.assert(report);
    reports.push(report);
  }

  // 8. Switch actor to adminUser via login to ensure admin JWT context
  const adminLoginBody = {
    identifier: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 9. Fetch first page of moderation reports as adminUser
  const PAGE_SIZE = 3;
  const requestPage1 = {
    page: 1,
    pageSize: PAGE_SIZE,
    targetType: undefined,
    status: undefined,
    severity: undefined,
    reportedUserId: undefined,
    reportingUserId: undefined,
    communityId: undefined,
    from: undefined,
    to: undefined,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformPostReport.IRequest;

  const page1: IPageICommunityPlatformPostReport.ISummary =
    await api.functional.communityPlatform.adminUser.moderation.search.reports.index(
      connection,
      { body: requestPage1 },
    );
  typia.assert(page1);

  // 10. Fetch second page
  const requestPage2 = {
    ...requestPage1,
    page: 2,
  } satisfies ICommunityPlatformPostReport.IRequest;

  const page2: IPageICommunityPlatformPostReport.ISummary =
    await api.functional.communityPlatform.adminUser.moderation.search.reports.index(
      connection,
      { body: requestPage2 },
    );
  typia.assert(page2);

  const pagination1 = page1.pagination;
  const pagination2 = page2.pagination;

  // 11. Basic pagination metadata assertions
  TestValidator.equals(
    "page1 current equals requested page 1",
    pagination1.current,
    1,
  );
  TestValidator.equals(
    "page1 limit equals requested page size",
    pagination1.limit,
    PAGE_SIZE,
  );
  TestValidator.equals(
    "page2 current equals requested page 2",
    pagination2.current,
    2,
  );
  TestValidator.equals(
    "page2 limit equals requested page size",
    pagination2.limit,
    PAGE_SIZE,
  );

  TestValidator.equals(
    "pagination.records is consistent across pages",
    pagination1.records,
    pagination2.records,
  );
  TestValidator.equals(
    "pagination.pages is consistent across pages",
    pagination1.pages,
    pagination2.pages,
  );

  TestValidator.predicate(
    "pagination.records should be at least number of created reports",
    pagination1.records >= reports.length,
  );
  TestValidator.predicate(
    "pagination.pages should be at least 1",
    pagination1.pages >= 1,
  );
  TestValidator.predicate(
    "current page should not exceed pages",
    pagination2.current <= pagination2.pages,
  );

  // 12. Non-overlapping pages by report ID
  const page1Ids = page1.data.map((r) => r.id);
  const page2Ids = page2.data.map((r) => r.id);

  const idIntersection = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals(
    "page1 and page2 should not share report IDs",
    idIntersection.length,
    0,
  );

  // 13. Sorting checks within each page (created_at desc)
  const isNonIncreasing = (
    items: ICommunityPlatformPostReport.ISummary[],
  ): boolean => {
    for (let i = 0; i + 1 < items.length; ++i) {
      const left = new Date(items[i].created_at).getTime();
      const right = new Date(items[i + 1].created_at).getTime();
      if (left < right) return false;
    }
    return true;
  };

  TestValidator.predicate(
    "page1 data is sorted by created_at desc",
    isNonIncreasing(page1.data),
  );
  TestValidator.predicate(
    "page2 data is sorted by created_at desc",
    isNonIncreasing(page2.data),
  );

  // 14. Combined ordering for first two pages
  const combined = page1.data.concat(page2.data);
  TestValidator.predicate(
    "combined page1+page2 data is sorted by created_at desc",
    isNonIncreasing(combined),
  );

  const expectedCombinedLength = Math.min(PAGE_SIZE * 2, pagination1.records);
  TestValidator.equals(
    "combined length matches first two pages of global result",
    combined.length,
    expectedCombinedLength,
  );

  // 15. Edge condition: request a page beyond the last page
  const beyondPageNumber = pagination1.pages + 1;
  const requestBeyond = {
    ...requestPage1,
    page: beyondPageNumber,
  } satisfies ICommunityPlatformPostReport.IRequest;

  const beyond: IPageICommunityPlatformPostReport.ISummary =
    await api.functional.communityPlatform.adminUser.moderation.search.reports.index(
      connection,
      { body: requestBeyond },
    );
  typia.assert(beyond);

  TestValidator.equals(
    "beyond page current equals requested beyond page",
    beyond.pagination.current,
    beyondPageNumber,
  );
  TestValidator.equals(
    "beyond page limit remains same",
    beyond.pagination.limit,
    PAGE_SIZE,
  );
  TestValidator.equals(
    "beyond page records matches previous pages",
    beyond.pagination.records,
    pagination1.records,
  );
  TestValidator.equals(
    "beyond page pages matches previous pages",
    beyond.pagination.pages,
    pagination1.pages,
  );
  TestValidator.equals(
    "beyond page returns empty data array",
    beyond.data.length,
    0,
  );
}
