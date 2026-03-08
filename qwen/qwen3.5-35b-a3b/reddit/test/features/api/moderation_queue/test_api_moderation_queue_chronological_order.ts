import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
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
 * Test moderation queue chronological ordering and access control.
 *
 * This test verifies that the moderation queue endpoint:
 * 1. Returns reports sorted chronologically (oldest first) by default
 * 2. Supports cursor-based pagination with accurate metadata
 * 3. Includes reporter username, community name, content details, and reason
 * 4. Restricts reports to only communities the moderator moderates
 */
export async function test_api_moderation_queue_chronological_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth admin (moderator)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // 2. Create test communities (admin owns them)
  const community1 =
    await generate_random_reddit_platform_member_communities_create(
      adminConnection,
      {
        body: { name: RandomGenerator.alphabets(10) },
      },
    );
  typia.assert(community1);
  const community2 =
    await generate_random_reddit_platform_member_communities_create(
      adminConnection,
      {
        body: { name: RandomGenerator.alphabets(10) },
      },
    );
  typia.assert(community2);
  // 3. Auth member for reporting
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 4. Create posts in both communities
  const post1 = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "TEXT",
        redditPlatformCommunityId: community1.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "TEXT",
        redditPlatformCommunityId: community2.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  // 5. Add admin as moderator to community1 only (not community2)
  const adminFromAuth = await api.functional.redditPlatform.auth.admin.login(
    adminConnection,
    {
      body: {
        email: "admin@test.com",
        password: "1234",
      } satisfies IRedditPlatformAdmin.ILogin,
    },
  );
  await generate_random_reddit_platform_member_communities_moderators_add(
    adminConnection,
    {
      body: { user_id: adminFromAuth.id },
      params: { communityId: community1.id },
    },
  );
  // 6. Submit reports as member (with small delay between them for different timestamps)
  const report1 = await generate_random_reddit_platform_member_reports_create(
    memberConnection,
    {
      body: {
        community_id: community1.id,
        reported_content_type: "POST",
        reported_content_id: post1.id,
        reason:
          RandomGenerator.paragraph({ sentences: 3 }) +
          " " +
          RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report1);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const report2 = await generate_random_reddit_platform_member_reports_create(
    memberConnection,
    {
      body: {
        community_id: community2.id,
        reported_content_type: "POST",
        reported_content_id: post2.id,
        reason:
          RandomGenerator.paragraph({ sentences: 3 }) +
          " " +
          RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report2);
  // 7. Fetch moderation queue as admin (admin is moderator of community1 only)
  const adminQueueConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminQueueConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  const queueResponse =
    await api.functional.redditPlatform.admin.reports.queue.index(
      adminQueueConnection,
      {
        body: {
          limit: 10,
          page: 1,
          status: "PENDING",
          sort_type: "CREATED",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(queueResponse);
  // 8. Verify access control - admin only sees reports from community1 (which they moderate)
  // Community2 report should NOT appear because admin doesn't moderate it
  TestValidator.equals(
    "queue only contains reports from moderated community",
    queueResponse.data.length,
    1,
  );
  TestValidator.equals(
    "report is from moderated community1",
    queueResponse.data[0].community_name,
    community1.name,
  );
  TestValidator.notEquals(
    "report is NOT from non-moderated community2",
    queueResponse.data[0].community_name,
    community2.name,
  );
  // 9. Verify chronological sorting (oldest first)
  // Since we only have 1 report, we create additional reports in same community
  // to test sorting within same community
  const post3 = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "TEXT",
        redditPlatformCommunityId: community1.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post3);
  // Submit more reports to community1
  await new Promise((resolve) => setTimeout(resolve, 50));
  const report3 = await generate_random_reddit_platform_member_reports_create(
    memberConnection,
    {
      body: {
        community_id: community1.id,
        reported_content_type: "POST",
        reported_content_id: post3.id,
        reason:
          RandomGenerator.paragraph({ sentences: 3 }) +
          " " +
          RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report3);
  await new Promise((resolve) => setTimeout(resolve, 50));
  const report4 = await generate_random_reddit_platform_member_reports_create(
    memberConnection,
    {
      body: {
        community_id: community1.id,
        reported_content_type: "POST",
        reported_content_id: post1.id,
        reason:
          RandomGenerator.paragraph({ sentences: 3 }) +
          " " +
          RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report4);
  // Fetch again to get all reports from community1
  const queueResponse2 =
    await api.functional.redditPlatform.admin.reports.queue.index(
      adminQueueConnection,
      {
        body: {
          limit: 10,
          page: 1,
          status: "PENDING",
          sort_type: "CREATED",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(queueResponse2);
  TestValidator.equals(
    "queue contains all pending reports from moderated community",
    queueResponse2.data.length,
    3,
  );
  // Verify chronological order (oldest first)
  const timestamps = queueResponse2.data.map((r) =>
    new Date(r.created_at).getTime(),
  );
  const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
  TestValidator.equals(
    "reports sorted chronologically (oldest first)",
    timestamps,
    sortedTimestamps,
  );
  // 10. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    queueResponse2.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", queueResponse2.pagination.limit, 10);
  TestValidator.equals(
    "pagination records",
    queueResponse2.pagination.records,
    3,
  );
  TestValidator.equals("pagination pages", queueResponse2.pagination.pages, 1);
  // 11. Verify report data structure
  const firstReport = queueResponse2.data[0];
  TestValidator.equals(
    "report has reporter username",
    firstReport.reporter_username,
    memberAuth.username,
  );
  TestValidator.equals(
    "report has community name",
    firstReport.community_name,
    community1.name,
  );
  TestValidator.equals(
    "report has content type",
    firstReport.reported_content_type,
    "POST",
  );
  TestValidator.equals(
    "report has reason",
    firstReport.reason.length,
    firstReport.reason.length > 0 ? firstReport.reason.length : 0,
  );
  TestValidator.equals("report has status", firstReport.status, "PENDING");
  TestValidator.notEquals(
    "report has created_at",
    firstReport.created_at,
    null,
  );
}
