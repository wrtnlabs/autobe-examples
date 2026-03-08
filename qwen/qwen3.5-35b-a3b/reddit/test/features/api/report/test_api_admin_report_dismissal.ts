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
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_admin_report_dismissal(
  connection: api.IConnection,
): Promise<void> {
  // Store admin password for later login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // 1. Admin setup - create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  const adminId = adminAuth.id;
  // 2. First member setup - create community and subscribe
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
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
    },
  });
  // Create community as member1
  const community =
    await api.functional.redditPlatform.member.communities.create(
      member1Connection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Subscribe member1 to their own community
  await api.functional.redditPlatform.member.communities.subscribe(
    member1Connection,
    {
      communityId: community.id,
      body: {
        confirmSubscription: true,
      } satisfies IRedditPlatformCommunitySubscription.ICreate,
    },
  );
  // 3. Add admin as moderator to the community
  await api.functional.redditPlatform.member.communities.moderators.add(
    member1Connection,
    {
      communityId: community.id,
      body: {
        user_id: adminId,
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  // 4. Second member setup - create post in the community
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
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
    },
  });
  // Subscribe member2 to the community
  await api.functional.redditPlatform.member.communities.subscribe(
    member2Connection,
    {
      communityId: community.id,
      body: {
        confirmSubscription: true,
      } satisfies IRedditPlatformCommunitySubscription.ICreate,
    },
  );
  // Create post as member2 in the community
  const post = await api.functional.redditPlatform.member.posts.create(
    member2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Store post data before report to verify it remains unchanged
  const postTitleBefore = post.title;
  const postContentBefore = post.content;
  const postVoteScoreBefore = post.voteScore;
  const postId = post.id;
  // 5. Third member joins and reports on the post
  const member3Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member3Connection, {
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
    },
  });
  // Subscribe member3 to the community
  await api.functional.redditPlatform.member.communities.subscribe(
    member3Connection,
    {
      communityId: community.id,
      body: {
        confirmSubscription: true,
      } satisfies IRedditPlatformCommunitySubscription.ICreate,
    },
  );
  // Create report on the post
  const report = await api.functional.redditPlatform.member.reports.create(
    member3Connection,
    {
      body: {
        community_id: community.id,
        reported_content_type: "POST",
        reported_content_id: postId,
        reason: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  const reportId = report.id;
  // Verify report is initially PENDING
  TestValidator.equals("report status is PENDING", report.status, "PENDING");
  TestValidator.equals(
    "report resolved_by is null initially",
    report.resolvedBy,
    null,
  );
  // 6. Admin re-authenticates and dismisses the report
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // Dismiss the report
  const dismissedReport =
    await api.functional.redditPlatform.admin.reports.updateStatus(
      adminLoginConnection,
      {
        reportId: reportId,
        body: {
          status: "DISMISSED",
        } satisfies IRedditPlatformReport.IStatusUpdate,
      },
    );
  typia.assert(dismissedReport);
  // 7. Verify report status changed to DISMISSED
  TestValidator.equals(
    "report status is now DISMISSED",
    dismissedReport.status,
    "DISMISSED",
  );
  // 8. Verify resolved_by_id is set to admin's user ID
  TestValidator.equals(
    "report resolved_by is admin",
    dismissedReport.resolvedBy?.id,
    adminId,
  );
  // 9. Verify the report references the correct post
  TestValidator.equals(
    "report reported_content_id matches post",
    dismissedReport.reportedContentId,
    postId,
  );
  TestValidator.equals(
    "report reported_content_type is POST",
    dismissedReport.reportedContentType,
    "POST",
  );
  // 10. Verify post data remains unchanged (we have this from post creation)
  TestValidator.equals(
    "post title unchanged after report dismissal",
    post.title,
    postTitleBefore,
  );
  TestValidator.equals(
    "post content unchanged after report dismissal",
    post.content,
    postContentBefore,
  );
  TestValidator.equals(
    "post vote score unchanged after report dismissal",
    post.voteScore,
    postVoteScoreBefore,
  );
  TestValidator.notEquals(
    "post is not deleted after report dismissal",
    post.deletedAt,
    null,
  );
}
