import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReportSnapshot";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportSnapshot";
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
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

/**
 * Test that an authenticated admin moderator can retrieve audit history snapshots for a content moderation report.
 *
 * This test validates the complete report snapshot retrieval workflow including:
 * - Admin and member user setup with proper authentication
 * - Community creation and moderator appointment
 * - Post creation and content reporting
 * - Snapshot retrieval and comprehensive response validation
 */
export async function test_api_admin_reports_snapshots_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user and authenticate
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminUsername = RandomGenerator.alphaNumeric(12);
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: adminUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Admin creates a community
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminJoinConnection,
      {
        body: {
          name: communityName,
          description: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<200>
          >(),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(community);
  // 3. Create first member user and authenticate
  const member1JoinConnection: api.IConnection = { host: connection.host };
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphaNumeric(16);
  const member1Username = RandomGenerator.alphaNumeric(8).toLowerCase();
  const member1Auth = await authorize_member_join(member1JoinConnection, {
    body: {
      email: member1Email,
      password: member1Password,
      username: member1Username,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member1Auth);
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_login(member1Connection, {
    body: {
      email: member1Auth.email,
      password: member1Password,
    },
  });
  // 4. First member creates a post in the community
  const post = await api.functional.redditPlatform.member.posts.create(
    member1Connection,
    {
      body: {
        title: typia.random<string & tags.MinLength<1> & tags.MaxLength<300>>(),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: typia.random<string & tags.MinLength<10>>(),
      },
    },
  );
  typia.assert(post);
  // 5. Create second member user and authenticate
  const member2JoinConnection: api.IConnection = { host: connection.host };
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphaNumeric(16);
  const member2Username = RandomGenerator.alphaNumeric(8).toLowerCase();
  const member2Auth = await authorize_member_join(member2JoinConnection, {
    body: {
      email: member2Email,
      password: member2Password,
      username: member2Username,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member2Auth);
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_login(member2Connection, {
    body: {
      email: member2Auth.email,
      password: member2Password,
    },
  });
  // 6. Second member submits a report against the post
  const reportReason = typia.random<
    string & tags.MinLength<10> & tags.MaxLength<500>
  >();
  const report = await api.functional.redditPlatform.member.reports.create(
    member2Connection,
    {
      body: {
        community_id: community.id,
        reported_content_type: "POST",
        reported_content_id: post.id,
        reason: reportReason,
      },
    },
  );
  typia.assert(report);
  // 7. As admin moderator, retrieve snapshots for the report
  const adminSnapshotConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminSnapshotConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  const snapshots = await api.functional.redditPlatform.admin.reports.snapshots(
    adminSnapshotConnection,
    {
      reportId: report.id,
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(snapshots);
  // 8. Validate snapshot retrieval response
  TestValidator.equals(
    "snapshots pagination current",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "snapshots pagination limit",
    snapshots.pagination.limit,
    10,
  );
  TestValidator.equals(
    "snapshots pagination records",
    snapshots.pagination.records,
    1,
  );
  TestValidator.equals(
    "snapshots pagination pages",
    snapshots.pagination.pages,
    1,
  );
  TestValidator.notEquals(
    "snapshots data array not null",
    snapshots.data,
    null,
  );
  TestValidator.equals("snapshots data array length", snapshots.data.length, 1);
  const snapshot = snapshots.data[0];
  typia.assert(snapshot);
  // 9. Validate snapshot content
  TestValidator.equals(
    "snapshot reporter id matches report reporter",
    snapshot.reporter.id,
    report.reporter.id,
  );
  TestValidator.equals(
    "snapshot reporter username matches",
    snapshot.reporter.username,
    report.reporter.username,
  );
  TestValidator.equals(
    "snapshot reporter display_name matches",
    snapshot.reporter.displayName,
    report.reporter.displayName,
  );
  TestValidator.equals(
    "snapshot community id matches report community",
    snapshot.community.id,
    report.community.id,
  );
  TestValidator.equals(
    "snapshot community name matches",
    snapshot.community.name,
    report.community.name,
  );
  TestValidator.equals(
    "snapshot community description matches",
    snapshot.community.description,
    report.community.description,
  );
  TestValidator.equals(
    "snapshot reported_content_type matches",
    snapshot.reported_content_type,
    report.reportedContentType,
  );
  TestValidator.equals(
    "snapshot reported_content_id matches",
    snapshot.reported_content_id,
    report.reportedContentId,
  );
  TestValidator.equals(
    "snapshot reason matches",
    snapshot.reason,
    report.reason,
  );
  TestValidator.equals(
    "snapshot status is pending",
    snapshot.status,
    "pending",
  );
  // 10. Validate timestamp consistency
  TestValidator.equals(
    "snapshot_created_at matches report created_at",
    snapshot.snapshot_created_at,
    report.createdAt,
  );
  TestValidator.equals(
    "created_at matches snapshot_created_at",
    snapshot.created_at,
    snapshot.snapshot_created_at,
  );
  // 11. Validate reporter has required summary fields
  TestValidator.predicate(
    "reporter has username",
    snapshot.reporter.username.length > 0,
  );
  TestValidator.predicate(
    "reporter has display_name",
    snapshot.reporter.displayName.length > 0,
  );
  // 12. Validate community has required summary fields
  TestValidator.predicate(
    "community has name",
    snapshot.community.name.length > 0,
  );
  TestValidator.predicate(
    "community has subscriber_count",
    snapshot.community.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "community has created_at",
    snapshot.community.created_at !== undefined,
  );
  TestValidator.equals(
    "snapshot resolved_by is null for pending report",
    snapshot.resolvedBy,
    null,
  );
  TestValidator.equals(
    "resolved_at is null for pending report",
    snapshot.resolved_at,
    null,
  );
}