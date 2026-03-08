import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReportView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReportView";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformReportView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportView";
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
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_admin_report_views(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminUsername = `admin_${RandomGenerator.alphaNumeric(8)}`;
  const adminAuth = await authorize_admin_join(connection, {
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
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // 2. Admin creates community
  const communityName = `test_${RandomGenerator.alphaNumeric(8)}`;
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Member joins
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberUsername = `member_${RandomGenerator.alphaNumeric(8)}`;
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberAuth.email,
      password: memberPassword,
    } satisfies IRedditPlatformMember.ILogin,
  });
  // 4. Member subscribes to community
  const subscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberConnection,
      {
        communityId: community.id,
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5. Member creates post
  const postTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 5,
  });
  const postContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        title: postTitle,
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: postContent,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Member submits report
  const reportReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 8,
  });
  const report = await api.functional.redditPlatform.member.reports.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        reported_content_type: "POST",
        reported_content_id: post.id,
        reason: reportReason,
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // 7. Admin approves report (creates view record)
  const updatedReport =
    await api.functional.redditPlatform.admin.reports.updateStatus(
      adminConnection,
      {
        reportId: report.id,
        body: {
          status: "RESOLVED",
        } satisfies IRedditPlatformReport.IStatusUpdate,
      },
    );
  typia.assert(updatedReport);
  // 8. Admin queries report views
  const viewResponse =
    await api.functional.redditPlatform.admin.reports.views.index(
      adminConnection,
      {
        reportId: report.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformReportView.IRequest,
      },
    );
  typia.assert(viewResponse);
  // 9. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    viewResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", viewResponse.pagination.limit, 20);
  TestValidator.equals(
    "pagination records",
    viewResponse.pagination.records,
    1,
  );
  TestValidator.equals("pagination pages", viewResponse.pagination.pages, 1);
  // 10. Verify view records
  TestValidator.equals("view records count", viewResponse.data.length, 1);
  const viewRecord = viewResponse.data[0];
  typia.assert(viewRecord);
  // Verify moderator reference
  TestValidator.equals(
    "view record has moderator id",
    viewRecord.moderator.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "view record has moderator username",
    viewRecord.moderator.username,
    adminUsername,
  );
  // Verify report reference
  TestValidator.equals(
    "view record has report id",
    viewRecord.report.id,
    report.id,
  );
  TestValidator.equals(
    "view record has reporter username",
    viewRecord.report.reporter_username,
    memberAuth.username,
  );
  TestValidator.equals(
    "view record has community name",
    viewRecord.report.community_name,
    communityName,
  );
  TestValidator.equals(
    "view record has reported content type",
    viewRecord.report.reported_content_type,
    "POST",
  );
  TestValidator.equals(
    "view record has reported content id",
    viewRecord.report.reported_content_id,
    post.id,
  );
  TestValidator.equals(
    "view record has report reason",
    viewRecord.report.reason,
    reportReason,
  );
  TestValidator.equals(
    "view record has report status",
    viewRecord.report.status,
    "RESOLVED",
  );
  // Verify timestamps
  TestValidator.predicate(
    "view record has viewed_at",
    () => viewRecord.viewed_at !== undefined && viewRecord.viewed_at !== null,
  );
  TestValidator.predicate(
    "view record has created_at",
    () => viewRecord.created_at !== undefined && viewRecord.created_at !== null,
  );
  TestValidator.predicate(
    "view record has updated_at",
    () => viewRecord.updated_at !== undefined && viewRecord.updated_at !== null,
  );
  // 11. Verify sort order (viewed_at descending)
  if (viewResponse.data.length > 1) {
    for (let i = 1; i < viewResponse.data.length; i++) {
      TestValidator.predicate(
        `view record at index ${i} should be older than previous`,
        () =>
          viewResponse.data[i].viewed_at <= viewResponse.data[i - 1].viewed_at,
      );
    }
  }
  // 12. Verify timestamps are in valid ISO format
  TestValidator.predicate(
    "viewed_at is valid ISO format",
    () => !isNaN(Date.parse(viewRecord.viewed_at)),
  );
  TestValidator.predicate(
    "created_at is valid ISO format",
    () => !isNaN(Date.parse(viewRecord.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO format",
    () => !isNaN(Date.parse(viewRecord.updated_at)),
  );
}
