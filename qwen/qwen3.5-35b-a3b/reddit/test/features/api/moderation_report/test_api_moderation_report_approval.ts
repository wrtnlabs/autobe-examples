import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_moderation_report_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account (future moderator)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IRedditPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Create community owner member
  const memberConnection1: api.IConnection = { host: connection.host };
  const member1: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection1, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(member1);
  // 3. Community owner creates a community
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection1,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: undefined,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Add admin as moderator to the community
  await api.functional.redditPlatform.member.communities.moderators.add(
    memberConnection1,
    {
      communityId: community.id,
      body: {
        user_id: admin.id,
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  // 5. Create post creator member
  const memberConnection2: api.IConnection = { host: connection.host };
  const member2: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection2, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(member2);
  // 6. Create a post in the community
  const post: IRedditPlatformPost =
    await api.functional.redditPlatform.member.posts.create(memberConnection2, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    });
  typia.assert(post);
  // 7. Create reporter member
  const memberConnection3: api.IConnection = { host: connection.host };
  const member3: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection3, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(member3);
  // 8. Submit a report on the post
  const reason = RandomGenerator.paragraph({
    sentences: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<15>
    >(),
  });
  const report: IRedditPlatformReport =
    await api.functional.redditPlatform.member.reports.create(
      memberConnection3,
      {
        body: {
          community_id: community.id,
          reported_content_type: "POST",
          reported_content_id: post.id,
          reason,
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // 9. Verify report was created with PENDING status
  TestValidator.equals("report status is PENDING", report.status, "PENDING");
  TestValidator.equals(
    "report community matches",
    report.community.id,
    community.id,
  );
  TestValidator.equals(
    "report reported content type is POST",
    report.reportedContentType,
    "POST",
  );
  TestValidator.equals(
    "report reported content id matches",
    report.reportedContentId,
    post.id,
  );
  TestValidator.equals(
    "report reporter matches member3",
    report.reporter.id,
    member3.id,
  );
  TestValidator.equals(
    "resolved_by_id is null (pending)",
    report.resolvedBy,
    null,
  );
  // 10. Login admin and approve the report
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: admin.email,
      password: adminPassword,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // Update report status to RESOLVED
  const updatedReport: IRedditPlatformReport =
    await api.functional.redditPlatform.admin.reports.updateStatus(
      adminLoginConnection,
      {
        reportId: report.id,
        body: {
          status: "RESOLVED",
        } satisfies IRedditPlatformReport.IStatusUpdate,
      },
    );
  typia.assert(updatedReport);
  // 11. Verify report was successfully updated to RESOLVED
  TestValidator.equals(
    "report status changed to RESOLVED",
    updatedReport.status,
    "RESOLVED",
  );
  TestValidator.equals(
    "resolved_by_id is set to admin ID",
    updatedReport.resolvedBy?.id,
    admin.id,
  );
  TestValidator.equals(
    "report community still matches",
    updatedReport.community.id,
    community.id,
  );
  TestValidator.equals(
    "report reported content type unchanged",
    updatedReport.reportedContentType,
    "POST",
  );
  TestValidator.equals(
    "report reported content id unchanged",
    updatedReport.reportedContentId,
    post.id,
  );
  TestValidator.equals(
    "report reporter unchanged",
    updatedReport.reporter.id,
    member3.id,
  );
}
