import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalReport";

export async function test_api_report_retrieval_unauthorized_denied(
  connection: api.IConnection,
) {
  /**
   * Negative-case E2E test: Ensure a report created by a member (reporter) is
   * retrievable by that reporter but denied to another authenticated member.
   * The reporter's retrieval is validated first (success), then a second member
   * is created and their retrieval attempt must fail with either 403 or 404.
   */

  // 1) Reporter registers
  const reporterEmail: string = typia.random<string & tags.Format<"email">>();
  const reporter: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: `rep_${RandomGenerator.alphaNumeric(6)}`,
        email: reporterEmail,
        password: "Password123!",
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(reporter);

  // 2) Create community as reporter
  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: {
        name: RandomGenerator.name(3),
        is_private: false,
        visibility: "public",
      } satisfies ICommunityPortalCommunity.ICreate,
    });
  typia.assert(community);

  // 3) Create a text post in the community as reporter
  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPortalPost.ICreate,
    });
  typia.assert(post);

  // 4) Create a report for the post as reporter (include communityId for completeness)
  const report: ICommunityPortalReport =
    await api.functional.communityPortal.member.reports.create(connection, {
      body: {
        communityId: community.id,
        postId: post.id,
        reasonCode: "spam",
        reasonText: RandomGenerator.paragraph({ sentences: 4 }),
        isUrgent: false,
      } satisfies ICommunityPortalReport.ICreate,
    });
  typia.assert(report);

  // 5) Reporter attempts to retrieve the report (must succeed)
  const fetchedByReporter: ICommunityPortalReport =
    await api.functional.communityPortal.member.reports.at(connection, {
      reportId: report.id,
    });
  typia.assert(fetchedByReporter);
  TestValidator.equals(
    "report retrievable by reporter",
    fetchedByReporter.id,
    report.id,
  );

  // Optional: If reporterUserId is present on the retrieved report, ensure it matches the reporter
  if (
    fetchedByReporter.reporterUserId !== null &&
    fetchedByReporter.reporterUserId !== undefined
  ) {
    TestValidator.equals(
      "retrieved report reporter matches created reporter",
      fetchedByReporter.reporterUserId,
      reporter.id,
    );
  }

  // 6) Register a second member (switches authentication context)
  const otherEmail: string = typia.random<string & tags.Format<"email">>();
  const otherMember: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: `other_${RandomGenerator.alphaNumeric(6)}`,
        email: otherEmail,
        password: "Password123!",
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(otherMember);

  // 7) Second member attempts to retrieve the same report (must be denied)
  await TestValidator.httpError(
    "non-reporting member cannot retrieve reporter-scoped report",
    [403, 404],
    async () => {
      await api.functional.communityPortal.member.reports.at(connection, {
        reportId: report.id,
      });
    },
  );
}
