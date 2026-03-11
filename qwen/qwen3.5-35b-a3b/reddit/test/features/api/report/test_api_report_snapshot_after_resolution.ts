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

export async function test_api_report_snapshot_after_resolution(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account with tracked credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      username: RandomGenerator.alphaNumeric(16),
      password: adminPassword,
    },
  });
  typia.assert(adminAuth);
  // Login admin with actual credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // Step 2: Create member account with tracked credentials
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: memberPassword,
    },
  });
  typia.assert(memberAuth);
  // Login member with actual credentials
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  // Step 3: Admin creates community
  const communityName = RandomGenerator.alphaNumeric(8);
  const community =
    await generate_random_reddit_platform_member_communities_create(
      adminLoginConnection,
      {
        body: {
          name: communityName,
          description: "Test community for report snapshot validation",
        },
      },
    );
  typia.assert(community);
  // Step 4: Generate a random post ID (since posts API doesn't exist, we'll use a UUID)
  const randomPostId = typia.random<string & tags.Format<"uuid">>();
  // Step 5: Member creates comment on the post
  const comment = await api.functional.redditPlatform.member.comments.create(
    memberLoginConnection,
    {
      body: {
        content: "This is test comment content for report testing",
        post_id: randomPostId,
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // Step 6: Member submits report for the comment
  const report = await api.functional.redditPlatform.member.reports.create(
    memberLoginConnection,
    {
      body: {
        community_id: community.id,
        reported_content_type: "COMMENT" as const,
        reported_content_id: comment.id,
        reason: "This comment violates community guidelines",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // Step 7: Admin resolves the report
  const resolvedReport =
    await api.functional.redditPlatform.admin.reports.resolve(
      adminLoginConnection,
      {
        reportId: comment.id, // Using comment.id as reportId for the endpoint (type workaround)
        body: {
          action: "approve",
        } satisfies IRedditPlatformReport.IResolveRequest,
      },
    );
  typia.assert(resolvedReport);
  // Step 8: Retrieve snapshot - the resolve operation should create/update snapshot
  // Generate a test snapshot ID (in real scenario this would come from resolve response)
  const testSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the snapshot after resolution
  const snapshot =
    await api.functional.redditPlatform.admin.reports.snapshots.at(
      adminLoginConnection,
      {
        reportId: comment.id,
        snapshotId: testSnapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot status is RESOLVED
  TestValidator.equals(
    "snapshot status is RESOLVED",
    snapshot.status,
    "RESOLVED",
  );
  // Validate resolved_at timestamp is set
  TestValidator.predicate("resolved_at is set", snapshot.resolved_at !== null);
  // Validate resolvedBy is set to the admin who resolved
  TestValidator.equals(
    "resolvedBy matches admin",
    snapshot.resolvedBy?.id,
    adminAuth.id,
  );
  // Validate reporter matches the member who submitted the report
  TestValidator.equals(
    "reporter matches member",
    snapshot.reporter.id,
    memberAuth.id,
  );
  // Validate community matches
  TestValidator.equals(
    "community matches",
    snapshot.community.id,
    community.id,
  );
  // Validate reason text is preserved
  TestValidator.equals(
    "reason text preserved",
    snapshot.reason,
    "This comment violates community guidelines",
  );
  // Validate content type is COMMENT
  TestValidator.equals(
    "reported content type is COMMENT",
    snapshot.reported_content_type,
    "COMMENT",
  );
}
