import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunitySLOMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySLOMetric";
import type { IDailyReportVolume } from "@ORGANIZATION/PROJECT-api/lib/structures/IDailyReportVolume";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IModeratorWorkload } from "@ORGANIZATION/PROJECT-api/lib/structures/IModeratorWorkload";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_snapshot_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - login for snapshot access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // 2. Member setup - join the system
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Member creates a community (becomes owner)
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Member creates a comment (using ICreate which is any | any)
  const comment = await api.functional.redditPlatform.member.comments.create(
    memberConnection,
    {
      body: typia.random<IRedditPlatformComment.ICreate>() as IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // 5. Member submits a report for the comment (creates snapshot)
  const report = await api.functional.redditPlatform.member.reports.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        reported_content_type: "COMMENT" as const,
        reported_content_id: comment.id,
        reason: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // 6. Admin retrieves the report snapshot
  // Note: snapshotId is the UUID of the snapshot record itself
  // The snapshot is created automatically when the report is submitted
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.redditPlatform.admin.reports.snapshots.at(
      adminConnection,
      {
        reportId: reportId,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot fields
  TestValidator.equals("snapshot id exists", snapshot.id, snapshot.id);
  TestValidator.equals(
    "reported content type is COMMENT",
    snapshot.reported_content_type,
    "COMMENT",
  );
  TestValidator.equals(
    "reported content id matches comment",
    snapshot.reported_content_id,
    comment.id,
  );
  TestValidator.equals("reason has content", snapshot.reason.length > 0, true);
  TestValidator.equals("status is PENDING", snapshot.status, "PENDING");
  TestValidator.equals(
    "reporter matches member",
    snapshot.reporter.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "community id matches",
    snapshot.community.id,
    community.id,
  );
  TestValidator.equals(
    "report id matches parent report",
    snapshot.reddit_platform_report_id,
    reportId,
  );
  TestValidator.predicate(
    "resolved_at is null for PENDING",
    snapshot.resolved_at === null || snapshot.resolved_at === undefined,
  );
  TestValidator.predicate(
    "snapshot_created_at is valid timestamp",
    snapshot.snapshot_created_at !== undefined,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    snapshot.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    snapshot.updated_at !== undefined,
  );
}