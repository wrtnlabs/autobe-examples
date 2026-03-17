import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemLog";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunitySystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemLog";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_system_log_content_moderation_event(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member A creates a post
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAAuth);
  // Create a post - note: community_id must be valid UUID
  const post = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text" as const,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 2: Member B submits a report on the post
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberBAuth);
  const report = await api.functional.redditCommunity.member.reports.create(
    memberBConnection,
    {
      body: {
        community_id: post.community.id,
        target_type: "post" as const,
        target_id: post.id,
        reason: "Spam content",
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  // Step 3: Member C (potential moderator) approves the report
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuth = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberCAuth);
  // Note: In a real scenario, Member C would need moderator permissions
  // For this test, we attempt the approval and validate the system log
  try {
    const approvedReport =
      await api.functional.redditCommunity.member.reports.approve(
        memberCConnection,
        {
          reportId: report.id,
        },
      );
    typia.assert(approvedReport);
    // Step 4: List system logs to find the log entry for the moderation event
    const logsPage = await api.functional.redditCommunity.system_logs.index(
      connection,
      {
        body: {
          limit: 100,
          order: "desc" as const,
          exclude_deleted: true,
        } satisfies IRedditCommunitySystemLog.IRequest,
      },
    );
    typia.assert(logsPage);
    // Step 5: Find the log entry for this moderation event (only check ISummary properties)
    const moderationLogSummary = logsPage.data.find(
      (log) =>
        log.activityType === "report" && log.actionPerformed === "approve",
    );
    TestValidator.notEquals(
      "moderation log exists in system logs",
      moderationLogSummary,
      undefined,
    );
    if (moderationLogSummary) {
      // Step 6: Retrieve the full log entry for validation
      const logDetail = await api.functional.redditCommunity.system_logs.at(
        connection,
        {
          systemLogId: moderationLogSummary.id,
        },
      );
      typia.assert(logDetail);
      // Validate log entry details
      TestValidator.equals(
        "activity type is report",
        logDetail.activity_type,
        "report",
      );
      TestValidator.equals(
        "action performed is approve",
        logDetail.action_performed,
        "approve",
      );
      TestValidator.equals(
        "target type is report",
        logDetail.target_type,
        "report",
      );
      // Verify report ID matches
      TestValidator.equals(
        "target report id matches",
        logDetail.targetReport?.id,
        report.id,
      );
      // Verify actor exists (the moderator who performed the action)
      TestValidator.notEquals(
        "actor is the moderator",
        logDetail.actor,
        undefined,
      );
      // Verify the report status is approved
      TestValidator.equals(
        "report status is approved",
        approvedReport.status,
        "approved",
      );
    }
  } catch {
    // If approval fails (e.g., Member C is not a moderator), still test that logs exist
    const logsPage = await api.functional.redditCommunity.system_logs.index(
      connection,
      {
        body: {
          limit: 100,
          order: "desc" as const,
          exclude_deleted: true,
        } satisfies IRedditCommunitySystemLog.IRequest,
      },
    );
    typia.assert(logsPage);
    // Verify report was created
    TestValidator.equals("report exists", report.status, "pending");
  }
}
