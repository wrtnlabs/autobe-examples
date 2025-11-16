import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Validate creation of multiple post reports with varying reason categories and
 * severities.
 *
 * Business context:
 *
 * - A registered member user can create communities and posts.
 * - The same member user can submit multiple reports against the same post using
 *   different reason_category and severity combinations.
 *
 * Steps:
 *
 * 1. Join as a new member user (auth.memberUser.join) and obtain an authenticated
 *    session.
 * 2. Create a community suitable for posting
 *    (communityPlatform.memberUser.communities.create).
 * 3. Create a single post inside that community
 *    (communityPlatform.memberUser.posts.create).
 * 4. Define several (reason_category, severity) pairs and for each pair call
 *    communityPlatform.memberUser.postReports.create targeting the same
 *    post_id.
 * 5. For each created report, verify:
 *
 *    - Response type via typia.assert
 *    - Post?.id equals the original post.id when the summary is present
 *    - ReporterMember, when present, matches the joined member user
 *    - Reason_category and severity echo the input values
 *    - Status is a non-empty string
 * 6. Ensure multiple reports on the same post from the same member are accepted by
 *    asserting all report ids are unique and that the number of created reports
 *    matches the number of input combinations.
 */
export async function test_api_post_report_creation_with_different_reason_categories_and_severities(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community where the post will live
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(10),
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

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a single post in that community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 4. Define reason_category and severity combinations
  const combinations: Array<{
    reason_category: string;
    severity: string;
    withDetail: boolean;
  }> = [
    { reason_category: "spam", severity: "low", withDetail: true },
    { reason_category: "harassment", severity: "medium", withDetail: true },
    { reason_category: "hate", severity: "high", withDetail: false },
    { reason_category: "illegal", severity: "critical", withDetail: true },
    { reason_category: "other", severity: "medium", withDetail: false },
  ];

  const reports: ICommunityPlatformPostReport[] = [];

  // 5. Create reports for each combination
  for (const combo of combinations) {
    const body = {
      post_id: post.id,
      reason_category: combo.reason_category,
      reason_detail: combo.withDetail
        ? RandomGenerator.paragraph({ sentences: 4 })
        : null,
      severity: combo.severity,
    } satisfies ICommunityPlatformPostReport.ICreate;

    const report: ICommunityPlatformPostReport =
      await api.functional.communityPlatform.memberUser.postReports.create(
        connection,
        { body },
      );
    typia.assert(report);
    reports.push(report);
  }

  TestValidator.equals(
    "number of created reports matches combinations",
    reports.length,
    combinations.length,
  );

  // 6. Per-report validations
  for (let i = 0; i < reports.length; i++) {
    const report = reports[i];
    const combo = combinations[i];

    // post summary should reference the original post if present
    if (report.post !== undefined) {
      TestValidator.equals(
        `report[${i}] post summary has correct id`,
        report.post.id,
        post.id,
      );
    }

    // reporterMember should match the joined member when present
    if (report.reporterMember !== undefined && report.reporterMember !== null) {
      TestValidator.equals(
        `report[${i}] reporter member id matches`,
        report.reporterMember.id,
        member.id,
      );
      TestValidator.equals(
        `report[${i}] reporter username matches`,
        report.reporterMember.username,
        member.username,
      );
    }

    // reason_category and severity echo inputs
    TestValidator.equals(
      `report[${i}] reason_category matches input`,
      report.reason_category,
      combo.reason_category,
    );
    TestValidator.equals(
      `report[${i}] severity matches input`,
      report.severity,
      combo.severity,
    );

    // status is a non-empty string
    TestValidator.predicate(
      `report[${i}] status is non-empty`,
      report.status.length > 0,
    );
  }

  const ids = reports.map((r) => r.id);
  const uniqueIds = new Set(ids);
  TestValidator.equals(
    "all created report ids are unique",
    uniqueIds.size,
    reports.length,
  );
}
