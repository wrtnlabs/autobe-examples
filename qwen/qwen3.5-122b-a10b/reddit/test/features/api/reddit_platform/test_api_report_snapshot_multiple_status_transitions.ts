import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReportSnapshot";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

/**
 * Test report snapshot audit trail with status transition.
 *
 * 1. Moderator creates community and becomes owner
 * 2. Reporter submits a report on a post
 * 3. Moderator approves the report (approved snapshot created)
 * 4. Query snapshot endpoint to verify status transitions are captured
 * 5. Validate snapshots are sorted by created_at descending
 * 6. Validate pagination works correctly
 */
export async function test_api_report_snapshot_multiple_status_transitions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator and community
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  const community =
    await generate_random_reddit_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 2. Create reporter
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(reporterAuth);
  // 3. Subscribe reporter to community
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      reporterConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create post in community (by moderator)
  const post = await generate_random_reddit_platform_member_posts_create(
    moderatorConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Reporter creates report on post
  const report = await generate_random_reddit_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        post_id: post.id,
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals("report status pending", report.status, "pending");
  // 6. Moderator approves the report
  const approvedReport =
    await api.functional.redditPlatform.member.reports.update(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          status: "approved",
        } satisfies IRedditPlatformReport.IUpdate,
      },
    );
  typia.assert(approvedReport);
  TestValidator.equals(
    "report status approved",
    approvedReport.status,
    "approved",
  );
  // 7. Query snapshots endpoint
  const snapshots =
    await api.functional.redditPlatform.member.reports.snapshots.index(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies IRedditPlatformReportSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 8. Validate snapshot count
  TestValidator.predicate("at least one snapshot", snapshots.data.length >= 1);
  TestValidator.predicate(
    "pagination records",
    snapshots.pagination.records >= 1,
  );
  // 9. Validate snapshots are sorted by created_at descending
  const timestamps = snapshots.data.map((s) => s.created_at);
  for (let i = 0; i < timestamps.length - 1; i++) {
    TestValidator.predicate(
      `snapshot ${i} created_at >= snapshot ${i + 1} created_at`,
      timestamps[i] >= timestamps[i + 1],
    );
  }
  // 10. Validate resolved snapshots have moderator field populated
  const resolvedSnapshots = snapshots.data.filter(
    (s) => s.status !== "pending",
  );
  for (const snapshot of resolvedSnapshots) {
    TestValidator.predicate(
      `moderator populated for ${snapshot.status} snapshot`,
      snapshot.moderator !== null && snapshot.moderator !== undefined,
    );
  }
  // 11. Validate the latest snapshot shows approved status
  if (snapshots.data.length > 0) {
    const latestSnapshot = snapshots.data[0];
    TestValidator.equals(
      "latest snapshot status",
      latestSnapshot.status,
      "approved",
    );
  }
}