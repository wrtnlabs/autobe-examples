import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

/**
 * Test moderator report approval workflow for the Reddit-like community platform.
 * 1. Create member users
 * 2. Member submits a report (directly via member reports API)
 * 3. Moderator retrieves pending reports
 * 4. Moderator approves the report
 * 5. Verify report status changes to approved
 * 6. Test idempotency of report approval
 */
export async function test_api_moderator_report_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user to submit report (member1)
  const memberConnection1: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(memberConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member1);
  // 2. Create moderator user
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
      password: "12345678",
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      avatar_url: null,
      href: "https://example.com",
      referrer: "https://example.com/ref",
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(moderator);
  // 3. Moderator logs in to establish session
  const moderatorSession: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorSession, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MaxLength<255>
      >(),
      password: "12345678",
    } satisfies IRedditLikeModerator.ILogin,
  });
  // 4. Member1 logs in and creates a report for inappropriate content
  const member1Session: api.IConnection = { host: connection.host };
  await authorize_member_login(member1Session, {
    body: {
      email: member1.email,
      password: "12345678",
    } satisfies IRedditLikeMember.ILogin,
  });
  const report = await api.functional.redditLike.member.reports.create(
    member1Session,
    {
      body: {
        reported_post_id:
          "00000000-0000-0000-0000-000000000000" satisfies string &
            tags.Format<"uuid">,
        reason: "This post contains inappropriate content",
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals("report status is pending", report.status, "pending");
  // 5. Moderator retrieves pending reports
  const reports = await api.functional.redditLike.moderator.reports.index(
    moderatorSession,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 10,
      } satisfies IRedditLikeReport.IRequest,
    },
  );
  typia.assert(reports);
  TestValidator.predicate(
    "report found in pending list",
    reports.data.some((r) => r.id === report.id),
  );
  // 6. Moderator approves the report
  await api.functional.redditLike.moderator.reports.approve(moderatorSession, {
    reportId: report.id,
  });
  // 7. Verify report status changed to approved
  const updatedReports =
    await api.functional.redditLike.moderator.reports.index(moderatorSession, {
      body: {
        status: "approved",
        page: 1,
        limit: 10,
      } satisfies IRedditLikeReport.IRequest,
    });
  typia.assert(updatedReports);
  TestValidator.predicate(
    "report found in approved list",
    updatedReports.data.some((r) => r.id === report.id),
  );
  // 8. Verify report record is preserved for audit
  const auditReports = await api.functional.redditLike.moderator.reports.index(
    moderatorSession,
    {
      body: {
        status: "approved",
        page: 1,
        limit: 10,
      } satisfies IRedditLikeReport.IRequest,
    },
  );
  const approvedReport = auditReports.data.find((r) => r.id === report.id);
  TestValidator.notEquals("report record exists", approvedReport, undefined);
  TestValidator.equals(
    "report has correct status",
    approvedReport?.status,
    "approved",
  );
  // 9. Test idempotency - approve same report again should work
  await api.functional.redditLike.moderator.reports.approve(moderatorSession, {
    reportId: report.id,
  });
  // 10. Final verification of report audit trail
  const finalReports = await api.functional.redditLike.moderator.reports.index(
    moderatorSession,
    {
      body: {
        status: "approved",
        page: 1,
        limit: 10,
      } satisfies IRedditLikeReport.IRequest,
    },
  );
  const finalApprovedReport = finalReports.data.find((r) => r.id === report.id);
  TestValidator.equals(
    "final report status is approved",
    finalApprovedReport?.status,
    "approved",
  );
}
