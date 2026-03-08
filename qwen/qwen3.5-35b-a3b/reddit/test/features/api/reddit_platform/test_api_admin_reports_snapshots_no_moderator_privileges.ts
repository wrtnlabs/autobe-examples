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
 * Test that report snapshots audit history is restricted to moderators of the specific community.
 * Verifies that unauthorized users cannot access moderation audit trails.
 */
export async function test_api_admin_reports_snapshots_no_moderator_privileges(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user A (will be moderator)
  const adminAResponse = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
      username: RandomGenerator.alphaNumeric(8),
      href: "http://localhost:3000/admin/join",
      referrer: "http://localhost:3000/admin",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAResponse);
  // 2. Create admin user B (will NOT be moderator)
  const adminBResponse = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
      username: RandomGenerator.alphaNumeric(8),
      href: "http://localhost:3000/admin/join",
      referrer: "http://localhost:3000/admin",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminBResponse);
  // 3. Create member user (will create content to be reported)
  const memberResponse = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "Member1234!",
      href: "http://localhost:3000/member/join",
      referrer: "http://localhost:3000/member",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberResponse);
  // 4. Create community using member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberResponse.email,
      password: "Member1234!",
    },
  });
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: "Test community for report snapshots",
        },
      },
    );
  typia.assert(community);
  // 5. Make admin A moderator using member connection
  await api.functional.redditPlatform.member.communities.moderators.add(
    memberConnection,
    {
      communityId: community.id,
      body: {
        user_id: adminAResponse.id,
      },
    },
  );
  // 6. Create post in community using member connection
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        title: "Test Post for Report",
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: "This is a test post content that can be reported",
      },
    },
  );
  typia.assert(post);
  // 7. Create report on post using member connection
  const report = await api.functional.redditPlatform.member.reports.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        reported_content_type: "POST",
        reported_content_id: post.id,
        reason: "This post contains inappropriate content for testing",
      },
    },
  );
  typia.assert(report);
  // 8. Try to access snapshots as admin B (should get 403 Forbidden)
  const adminBConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminBConnection, {
    body: {
      email: adminBResponse.email,
      password: "Admin1234!",
    },
  });
  await TestValidator.httpError(
    "admin B should get 403 Forbidden when accessing report snapshots",
    403,
    async () => {
      await api.functional.redditPlatform.admin.reports.snapshots(
        adminBConnection,
        {
          reportId: report.id,
          body: {
            limit: 10,
          },
        },
      );
    },
  );
}
