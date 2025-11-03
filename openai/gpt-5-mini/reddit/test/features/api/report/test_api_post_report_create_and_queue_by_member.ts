import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsReport";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_post_report_create_and_queue_by_member(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Create two communityMember accounts (author, reporter)
   * - Author creates a community and a post inside it
   * - Reporter files a report against that post
   * - Validate that the returned ICommunityBbsReport reflects server-side
   *   reporter attribution, correct target linkage, reason_code,
   *   evidence_count, and triage metadata (status/priority)
   */

  // 1) Prepare isolated actor connections
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const reporterConn: api.IConnection = { ...connection, headers: {} };

  // 2) Create author account
  const authorEmail = `author.${RandomGenerator.alphaNumeric(6)}@example.test`;
  const authorUsername = `author_${RandomGenerator.alphaNumeric(6)}`;
  const authorAuth = await api.functional.auth.communityMember.join(
    authorConn,
    {
      body: {
        email: authorEmail,
        username: authorUsername,
        password: "Passw0rd!",
        profile: {
          display_name: authorUsername,
        },
        session_context: {
          href: "https://example.test/signup",
          referrer: "https://example.test",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    },
  );
  typia.assert(authorAuth);

  // 3) Create reporter account
  const reporterEmail = `reporter.${RandomGenerator.alphaNumeric(6)}@example.test`;
  const reporterUsername = `reporter_${RandomGenerator.alphaNumeric(6)}`;
  const reporterAuth = await api.functional.auth.communityMember.join(
    reporterConn,
    {
      body: {
        email: reporterEmail,
        username: reporterUsername,
        password: "Passw0rd!",
        profile: {
          display_name: reporterUsername,
        },
        session_context: {
          href: "https://example.test/signup",
          referrer: "https://example.test",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    },
  );
  typia.assert(reporterAuth);

  // Ensure members are distinct
  TestValidator.notEquals(
    "author and reporter must be different members",
    authorAuth.member.id,
    reporterAuth.member.id,
  );

  // 4) Author creates a community
  const communitySlug =
    `test-community-${RandomGenerator.alphaNumeric(6)}`.toLowerCase();
  const community =
    await api.functional.communityBbs.communityMember.communities.create(
      authorConn,
      {
        body: {
          name: `E2E Test Community ${RandomGenerator.alphaNumeric(4)}`,
          slug: communitySlug,
          description: "E2E test community for reporting workflow",
          visibility: "public",
          post_approval_required: false,
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community slug matches",
    community.slug,
    communitySlug,
  );

  // 5) Author creates a post in the community
  const post =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      authorConn,
      {
        communitySlug: community.slug,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          post_type: "text",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community matches",
    post.community.slug,
    community.slug,
  );

  // 6) Reporter files a report for the post
  const report =
    await api.functional.communityBbs.communityMember.posts.report.create(
      reporterConn,
      {
        postId: post.id,
        body: {
          target_type: "post",
          target_id: post.id,
          reason_code: "spam",
          explanation: "Automated E2E: reporting sample spam content",
        } satisfies ICommunityBbsReport.ICreate,
      },
    );
  typia.assert(report);

  // 7) Business validations on the returned report
  // Reporter attribution must be server-derived and match reporter's id
  TestValidator.equals(
    "report reporter attribution",
    report.reporter_id,
    reporterAuth.member.id,
  );

  // Target linkage and reason
  TestValidator.equals("report target id", report.target_id, post.id);
  TestValidator.equals("report target type", report.target_type, "post");
  TestValidator.equals("report reason matches", report.reason_code, "spam");

  // Evidence count default when no attachments provided
  TestValidator.equals("evidence_count default 0", report.evidence_count, 0);

  // Status should be within initial lifecycle values (open or in_review)
  TestValidator.predicate(
    "report status open or in_review",
    report.status === "open" || report.status === "in_review",
  );

  // Priority must be one of canonical values
  TestValidator.predicate(
    "report priority is canonical",
    report.priority === "low" ||
      report.priority === "medium" ||
      report.priority === "high" ||
      report.priority === "critical",
  );

  // created_at presence validated by typia.assert; ensure non-empty string
  TestValidator.predicate(
    "report has created_at",
    typeof report.created_at === "string" && report.created_at.length > 0,
  );

  // 8) Submit a second report for the same post (idempotency / multi-report behaviour)
  const secondReport =
    await api.functional.communityBbs.communityMember.posts.report.create(
      reporterConn,
      {
        postId: post.id,
        body: {
          target_type: "post",
          target_id: post.id,
          reason_code: "spam",
          explanation: "Second automated report to check multi-report behavior",
        } satisfies ICommunityBbsReport.ICreate,
      },
    );
  typia.assert(secondReport);

  // If platform allows multiple reports, they should have distinct ids
  TestValidator.notEquals(
    "second report id differs from first",
    report.id,
    secondReport.id,
  );

  // Confirm second report also credited to same reporter
  TestValidator.equals(
    "second report reporter attribution",
    secondReport.reporter_id,
    reporterAuth.member.id,
  );

  // End of test flow. The test relies on external DB reset between suites.
}
