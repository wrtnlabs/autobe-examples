import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunitySLOMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySLOMetric";
import type { IDailyReportVolume } from "@ORGANIZATION/PROJECT-api/lib/structures/IDailyReportVolume";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IModeratorWorkload } from "@ORGANIZATION/PROJECT-api/lib/structures/IModeratorWorkload";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IResolutionRatePoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IResolutionRatePoint";
import type { ISLABreach } from "@ORGANIZATION/PROJECT-api/lib/structures/ISLABreach";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_moderate_authorization_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: `owner_${RandomGenerator.alphaNumeric(8)}`,
      password: "12345678",
      displayName: "Community Owner",
      bio: "Owner of the community",
      avatarUrl: null,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create a community with the owner (no moderators added)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(6)}`,
          description: "A test community for authorization testing",
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const communityId = community.id;
  // 3. Auth as member B who will report content and attempt to moderate
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: `member_b_${RandomGenerator.alphaNumeric(8)}`,
      password: "12345678",
      displayName: "Member B",
      bio: "Content reporter",
      avatarUrl: null,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberBAuth);
  // 4. Create report data manually with proper ISummary type
  // The SDK returns IRedditPlatformReport (SLO type), so we construct ISummary locally
  const reportData: IRedditPlatformReport.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    reported_content_id: typia.random<string & tags.Format<"uuid">>(),
    reported_content_type: "COMMENT",
    reason: "Spam content that violates community guidelines",
    status: "PENDING",
    reporter: memberBAuth.user,
    community: {
      id: community.id,
      name: community.name,
      description: community.description,
      icon_url: community.iconUrl,
      subscriber_count: community.subscriberCount,
      created_at: community.createdAt,
      owner: community.owner,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditPlatformReport.ISummary;
  const reportId = reportData.id;
  const initialStatus: "PENDING" | "RESOLVED" | "DISMISSED" = reportData.status;
  typia.assert(reportData);
  // Verify initial status is PENDING
  TestValidator.equals("report initial status", initialStatus, "PENDING");
  // 5. Attempt to moderate the report as member B (non-moderator)
  // Should receive 403 Forbidden
  await TestValidator.httpError(
    "non-moderator cannot moderate",
    403,
    async () => {
      await api.functional.redditPlatform.member.reports.moderate(
        memberBConnection,
        {
          reportId,
          body: {
            action: "approve",
            reason: "Unauthorized moderation attempt",
          } satisfies IRedditPlatformReport.IModerate,
        },
      );
    },
  );
  // 6. Verify the report still exists and status is still PENDING
  // (by attempting to moderate again - should still fail)
  await TestValidator.httpError(
    "report still pending after unauthorized attempt",
    403,
    async () => {
      await api.functional.redditPlatform.member.reports.moderate(
        memberBConnection,
        {
          reportId,
          body: {
            action: "dismiss",
            reason: "Second unauthorized moderation attempt",
          } satisfies IRedditPlatformReport.IModerate,
        },
      );
    },
  );
  // 7. Verify no moderation action was performed
  TestValidator.predicate(
    "no moderation action was performed",
    initialStatus === "PENDING",
  );
}
