import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunitySLOMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySLOMetric";
import type { IDailyReportVolume } from "@ORGANIZATION/PROJECT-api/lib/structures/IDailyReportVolume";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IModeratorWorkload } from "@ORGANIZATION/PROJECT-api/lib/structures/IModeratorWorkload";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReportSnapshot";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportSnapshot";
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

export async function test_api_report_snapshots_moderator_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (community owner) joins and gets authorized
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(memberAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        displayName: RandomGenerator.name(1),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(memberA);
  // 2. Member A creates a community (becomes owner with moderation authority)
  const community: IRedditPlatformCommunity =
    await generate_random_reddit_platform_member_communities_create(
      memberAConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<21> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Member B joins (will create the reported comment)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(memberBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        displayName: RandomGenerator.name(1),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(memberB);
  // 4. Member B creates a comment (in simulation mode, post_id uses random UUID)
  const comment: IRedditPlatformComment =
    await api.functional.redditPlatform.member.comments.create(
      memberBConnection,
      {
        body: {
          post_id: typia.random<string & tags.Format<"uuid">>(),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Member C joins (will report the comment)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(memberCConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        displayName: RandomGenerator.name(1),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(memberC);
  // 6. Member C reports the comment (creates initial PENDING snapshot)
  const reportReason = typia.random<
    string & tags.MinLength<10> & tags.MaxLength<500>
  >();
  const reportRaw: IRedditPlatformReport =
    await generate_random_reddit_platform_member_reports_create(
      memberCConnection,
      {
        body: {
          community_id: community.id,
          reported_content_type: "COMMENT",
          reported_content_id: comment.id,
          reason: reportReason,
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(reportRaw);
  const report: IRedditPlatformReport.ISummary = reportRaw as any;
  // 7. Member A (as community owner) retrieves the report snapshots
  const snapshots: IPageIRedditPlatformReportSnapshot.ISummary =
    await api.functional.redditPlatform.member.reports.snapshots.index(
      memberAConnection,
      {
        reportId: report.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "snapshot_created_at",
          sort_order: "desc",
        } satisfies IRedditPlatformReportSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 8. Validate snapshot chain integrity
  TestValidator.equals(
    "snapshot pagination records",
    snapshots.pagination.records,
    1,
  );
  TestValidator.equals("snapshot data count", snapshots.data.length, 1);
  // 9. Validate first snapshot has PENDING status
  const firstSnapshot: IRedditPlatformReportSnapshot.ISummary =
    snapshots.data[0];
  typia.assert(firstSnapshot);
  TestValidator.equals(
    "snapshot has PENDING status",
    firstSnapshot.status,
    "PENDING",
  );
  // 10. Validate snapshot includes reporter identity
  TestValidator.equals(
    "snapshot has reporter",
    firstSnapshot.reporter.id,
    memberC.user.id,
  );
  TestValidator.equals(
    "snapshot reporter username matches",
    firstSnapshot.reporter.username,
    memberC.user.username,
  );
  // 11. Validate snapshot includes community context
  TestValidator.equals(
    "snapshot has community context",
    firstSnapshot.community.id,
    community.id,
  );
  TestValidator.equals(
    "snapshot community name matches",
    firstSnapshot.community.name,
    community.name,
  );
  // 12. Validate snapshot includes reported content details
  TestValidator.equals(
    "snapshot reported content type is COMMENT",
    firstSnapshot.reported_content_type,
    "COMMENT",
  );
  TestValidator.equals(
    "snapshot reported content id matches",
    firstSnapshot.reported_content_id,
    comment.id,
  );
  // 13. Validate snapshot includes reason text
  TestValidator.equals(
    "snapshot reason matches report reason",
    firstSnapshot.reason,
    reportReason,
  );
  // 14. Validate resolved_by is null for pending snapshot
  TestValidator.equals(
    "pending snapshot has no resolved_by",
    firstSnapshot.resolved_by,
    undefined,
  );
  // 15. Validate resolved_at is null for pending snapshot
  TestValidator.equals(
    "pending snapshot has no resolved_at",
    firstSnapshot.resolved_at,
    undefined,
  );
  // 16. Validate snapshot timestamps
  TestValidator.predicate(
    "snapshot has valid snapshot_created_at",
    () => firstSnapshot.snapshot_created_at !== undefined,
  );
  TestValidator.predicate(
    "snapshot has valid created_at",
    () => firstSnapshot.created_at !== undefined,
  );
  TestValidator.predicate(
    "snapshot has valid updated_at",
    () => firstSnapshot.updated_at !== undefined,
  );
}
