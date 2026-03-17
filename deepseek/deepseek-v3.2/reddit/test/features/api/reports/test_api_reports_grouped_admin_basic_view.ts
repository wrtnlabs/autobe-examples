import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformReportApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportApproval";
import type { ICommunityPlatformReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDismissal";
import type { ICommunityPlatformReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComment";
import type { ICommunityPlatformReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentReport";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_content_report } from "../../../prepare/prepare_random_community_platform_content_report";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_reports_grouped_admin_basic_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Create member accounts for community owners
  const owner1Connection: api.IConnection = { host: connection.host };
  const owner1 = await authorize_member_join(owner1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner1);
  const owner2Connection: api.IConnection = { host: connection.host };
  const owner2 = await authorize_member_join(owner2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner2);
  // 3. Create communities with different owners
  const community1 =
    await generate_random_community_platform_member_communities_create(
      owner1Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community1);
  const community2 =
    await generate_random_community_platform_member_communities_create(
      owner2Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community2);
  // 4. Create posts in communities
  const post1 = await generate_random_community_platform_member_posts_create(
    owner1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community1.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.content({ paragraphs: 1 }),
          formatting: "plain",
        },
      },
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_community_platform_member_posts_create(
    owner2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community2.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.content({ paragraphs: 1 }),
          formatting: "plain",
        },
      },
    },
  );
  typia.assert(post2);
  // 5. Create reporter accounts
  const reporter1Connection: api.IConnection = { host: connection.host };
  const reporter1 = await authorize_member_join(reporter1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(reporter1);
  const reporter2Connection: api.IConnection = { host: connection.host };
  const reporter2 = await authorize_member_join(reporter2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(reporter2);
  // 6. Submit multiple reports against content
  const report1 =
    await generate_random_community_platform_member_reports_create(
      reporter1Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          postId: post1.id,
        },
      },
    );
  typia.assert(report1);
  const report2 =
    await generate_random_community_platform_member_reports_create(
      reporter2Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          postId: post1.id, // Same post, different reporter
        },
      },
    );
  typia.assert(report2);
  const report3 =
    await generate_random_community_platform_member_reports_create(
      reporter1Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          postId: post2.id,
        },
      },
    );
  typia.assert(report3);
  // 7. Assign admin as moderator to community1 only
  const moderationRole =
    await generate_random_community_platform_member_moderation_roles_create(
      owner1Connection,
      {
        params: { communityId: community1.id },
        body: {
          memberId: typia.random<string & tags.Format<"uuid">>(),
          roleType: "moderator",
        },
      },
    );
  typia.assert(moderationRole);
  // 8. Call grouped reports endpoint
  const groupedReports =
    await api.functional.communityPlatform.admin.reports.grouped.index(
      adminConnection,
      {
        body: {} satisfies ICommunityPlatformContentReport.IGroupedRequest,
      },
    );
  typia.assert(groupedReports);
  // 9. Validate response structure
  TestValidator.predicate(
    "grouped reports should have pagination",
    groupedReports.pagination !== undefined,
  );
  TestValidator.predicate(
    "grouped reports should have data array",
    Array.isArray(groupedReports.data),
  );
  // 10. Validate grouping and access control
  // Admin should only see reports from community1 (where they are moderator)
  // Reports from community2 should NOT appear
  const communityIdsInResponse = groupedReports.data.map(
    (group) => group.community.id,
  );
  // All reports should be from community1
  TestValidator.equals(
    "all reports should be from community where admin is moderator",
    communityIdsInResponse,
    [community1.id],
  );
  // Verify grouping functionality
  groupedReports.data.forEach((group) => {
    TestValidator.predicate(
      `group ${group.id} should have content_type`,
      group.content_type === "post" || group.content_type === "comment",
    );
    TestValidator.predicate(
      `group ${group.id} should have content_id`,
      typia.is<string & tags.Format<"uuid">>(group.content_id),
    );
    TestValidator.predicate(
      `group ${group.id} should have total_reports >= 1`,
      group.total_reports >= 1,
    );
    TestValidator.predicate(
      `group ${group.id} should have individual_reports array`,
      Array.isArray(group.individual_reports),
    );
    TestValidator.equals(
      `group ${group.id} total_reports should match individual_reports length`,
      group.total_reports,
      group.individual_reports.length,
    );
    // Verify individual report details
    group.individual_reports.forEach((individualReport) => {
      typia.assert(individualReport);
      TestValidator.predicate(
        `individual report ${individualReport.id} should have reporter`,
        individualReport.reporter !== undefined,
      );
      TestValidator.predicate(
        `individual report ${individualReport.id} should have non-empty reason`,
        individualReport.reason.trim().length > 0,
      );
      TestValidator.predicate(
        `individual report ${individualReport.id} should have status`,
        ["pending", "approved", "dismissed"].includes(individualReport.status),
      );
    });
  });
  // Find the group for post1 (should have 2 reports)
  const post1Group = groupedReports.data.find(
    (group) => group.content_id === post1.id,
  );
  TestValidator.predicate(
    "post1 should have a grouped report entry",
    post1Group !== undefined,
  );
  if (post1Group) {
    TestValidator.equals(
      "post1 should have 2 reports grouped together",
      post1Group.total_reports,
      2,
    );
    TestValidator.equals(
      "post1 group should contain both reporters",
      new Set(post1Group.individual_reports.map((r) => r.reporter.id)).size,
      2,
    );
  }
  // Verify post2 (from community2 where admin is NOT moderator) is NOT in results
  const post2Group = groupedReports.data.find(
    (group) => group.content_id === post2.id,
  );
  TestValidator.predicate(
    "post2 should NOT appear in results (admin not moderator in community2)",
    post2Group === undefined,
  );
}
