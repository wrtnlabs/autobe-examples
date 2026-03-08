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
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_view_cross_community_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register adminA (will moderate communityA only)
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminA = await authorize_admin_join(adminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminA);
  // 2. Register adminB (will moderate communityB only)
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminB = await authorize_admin_join(adminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminB);
  // 3. AdminA creates communityA (adminA is the owner)
  const adminA2Connection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminA2Connection, {
    body: {
      email: adminA.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  const communityA =
    await api.functional.redditPlatform.member.communities.create(
      adminA2Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  // 4. AdminB creates communityB (adminB is the owner)
  const adminB2Connection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminB2Connection, {
    body: {
      email: adminB.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  const communityB =
    await api.functional.redditPlatform.member.communities.create(
      adminB2Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  // 5. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 6. Member creates post in communityB
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "TEXT" as const,
        content: "Test post content for report testing",
        redditPlatformCommunityId: communityB.id,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 7. Member reports the post in communityB
  const report = await api.functional.redditPlatform.member.reports.create(
    memberConnection,
    {
      body: {
        community_id: communityB.id,
        reported_content_type: "POST" as const,
        reported_content_id: post.id,
        reason: "Test report reason for cross-community access denial testing",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // 8. AdminB views the report to create a view record
  const reportViews =
    await api.functional.redditPlatform.admin.reports.views.index(
      adminB2Connection,
      {
        reportId: report.id,
        body: {},
      },
    );
  typia.assert(reportViews);
  // Verify a view record was created
  const viewId = reportViews.data[0]?.id;
  if (!viewId) {
    throw new Error("No view record found for report");
  }
  // Test: AdminA attempts to access the view record (should fail with 403)
  await TestValidator.error(
    "adminA cannot access report views from communityB they do not moderate",
    async () => {
      await api.functional.redditPlatform.admin.reports.views.at(
        adminA2Connection,
        {
          reportId: report.id,
          viewId,
        },
      );
    },
  );
}
