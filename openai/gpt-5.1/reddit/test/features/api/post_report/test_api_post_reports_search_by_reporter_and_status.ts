import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReportTarget";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostReport";

export async function test_api_post_reports_search_by_reporter_and_status(
  connection: api.IConnection,
) {
  // 1. Create two member users: author (member A) and reporter (member B)
  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 2. Create an admin user
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Log in explicitly as member A (author) to ensure session context
  const memberALoginBody = {
    identifier: memberA.email,
    password: memberAJoinBody.password,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberALogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALogin);

  // 4. Member A creates a community
  const communityCreateBody = {
    slug: `${RandomGenerator.alphaNumeric(8)}-community`,
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

  // 5. Member A creates multiple posts in the community
  const posts: ICommunityPlatformPost[] = [];
  for (let i = 0; i < 3; i++) {
    const postCreateBody = {
      communityId: community.id,
      communityCode: community.slug,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.paragraph({ sentences: 10 }),
      url: undefined,
      postType: "text",
    } satisfies ICommunityPlatformPost.ICreate;

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body: postCreateBody },
      );
    typia.assert(post);
    posts.push(post);
  }

  // Helper to log in as a specific member by email/password
  const loginMember = async (
    email: string & tags.Format<"email">,
    password: string,
  ): Promise<ICommunityPlatformMemberuser.IAuthorized> => {
    const loginBody = {
      identifier: email,
      password,
      ip: null,
      href: "https://client.example.com/login",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILogin;

    const auth: ICommunityPlatformMemberuser.IAuthorized =
      await api.functional.auth.memberUser.login(connection, {
        body: loginBody,
      });
    typia.assert(auth);
    return auth;
  };

  // 6. Member B files multiple reports against member A's posts
  await loginMember(memberB.email, memberBJoinBody.password);

  const memberBReports: ICommunityPlatformPostReport[] = [];
  for (let i = 0; i < 4; i++) {
    const targetPost = posts[i % posts.length];
    const reportCreateBody = {
      post_id: targetPost.id,
      reason_category: RandomGenerator.pick([
        "spam",
        "harassment",
        "hate",
        "illegal",
        "other",
      ] as const),
      reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
      severity: RandomGenerator.pick([
        "low",
        "medium",
        "high",
        "critical",
      ] as const),
    } satisfies ICommunityPlatformPostReport.ICreate;

    const report: ICommunityPlatformPostReport =
      await api.functional.communityPlatform.memberUser.postReports.create(
        connection,
        { body: reportCreateBody },
      );
    typia.assert(report);
    memberBReports.push(report);
  }

  // Derive the status string from one of B's reports to use in the filter
  const memberBStatus: string = memberBReports[0].status;

  // 7. Member A also files some reports as noise
  await loginMember(memberA.email, memberAJoinBody.password);

  const memberAReports: ICommunityPlatformPostReport[] = [];
  for (let i = 0; i < 2; i++) {
    const targetPost = posts[(i + 1) % posts.length];
    const reportCreateBody = {
      post_id: targetPost.id,
      reason_category: "other",
      reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
      severity: "low",
    } satisfies ICommunityPlatformPostReport.ICreate;

    const report: ICommunityPlatformPostReport =
      await api.functional.communityPlatform.memberUser.postReports.create(
        connection,
        { body: reportCreateBody },
      );
    typia.assert(report);
    memberAReports.push(report);
  }

  // 8. Log back in as admin user to perform filtered search
  const adminLoginBody = {
    identifier: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://client.example.com/admin/login",
    referrer: "https://client.example.com/admin/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // Build request to filter by reporter (member B) and status
  const pageSize = 2;
  const requestBodyPage1 = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: pageSize as number & tags.Type<"int32">,
    targetType: "post",
    status: memberBStatus,
    severity: undefined,
    reportedUserId: undefined,
    reportingUserId: memberB.id,
    communityId: undefined,
    from: undefined,
    to: undefined,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformPostReport.IRequest;

  const page1: IPageICommunityPlatformPostReport.ISummary =
    await api.functional.communityPlatform.adminUser.postReports.index(
      connection,
      { body: requestBodyPage1 },
    );
  typia.assert(page1);

  const pagination1 = page1.pagination;
  typia.assert<IPage.IPagination>(pagination1);

  // 9. Validate reporter and status constraints for page 1
  for (const summary of page1.data) {
    typia.assert<ICommunityPlatformPostReport.ISummary>(summary);

    if (summary.reporter_memberuser !== undefined) {
      const reporter = summary.reporter_memberuser;
      TestValidator.equals(
        "all summaries on page 1 must belong to member B when reporter_memberuser is defined",
        reporter.id,
        memberB.id,
      );
    }

    TestValidator.equals(
      "all summaries on page 1 must have requested status",
      summary.status,
      memberBStatus,
    );
  }

  // Ensure no report from member A appears on page 1
  const hasMemberAOnPage1 = page1.data.some(
    (s) =>
      s.reporter_memberuser !== undefined &&
      s.reporter_memberuser.id === memberA.id,
  );
  TestValidator.predicate(
    "no summaries on page 1 should be reported by member A",
    hasMemberAOnPage1 === false,
  );

  // 10. If there are enough records for more than one page, fetch page 2 and validate consistency
  if (pagination1.records > pageSize) {
    const requestBodyPage2 = {
      page: 2 as number & tags.Type<"int32">,
      pageSize: pageSize as number & tags.Type<"int32">,
      targetType: "post",
      status: memberBStatus,
      severity: undefined,
      reportedUserId: undefined,
      reportingUserId: memberB.id,
      communityId: undefined,
      from: undefined,
      to: undefined,
      sortBy: "created_at",
      sortDirection: "desc",
    } satisfies ICommunityPlatformPostReport.IRequest;

    const page2: IPageICommunityPlatformPostReport.ISummary =
      await api.functional.communityPlatform.adminUser.postReports.index(
        connection,
        { body: requestBodyPage2 },
      );
    typia.assert(page2);
    typia.assert<IPage.IPagination>(page2.pagination);

    for (const summary of page2.data) {
      typia.assert<ICommunityPlatformPostReport.ISummary>(summary);

      if (summary.reporter_memberuser !== undefined) {
        const reporter = summary.reporter_memberuser;
        TestValidator.equals(
          "all summaries on page 2 must belong to member B when reporter_memberuser is defined",
          reporter.id,
          memberB.id,
        );
      }

      TestValidator.equals(
        "all summaries on page 2 must have requested status",
        summary.status,
        memberBStatus,
      );
    }

    const page1Ids = page1.data.map((s) => s.id);
    const page2Ids = page2.data.map((s) => s.id);

    const anyOverlap = page1Ids.some((id) => page2Ids.includes(id));
    TestValidator.predicate(
      "no overlapping report IDs between page 1 and page 2",
      anyOverlap === false,
    );
  }
}
