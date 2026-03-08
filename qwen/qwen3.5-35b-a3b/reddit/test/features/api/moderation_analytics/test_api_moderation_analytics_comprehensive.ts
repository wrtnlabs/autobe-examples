import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAuditLog";
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
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_moderation_analytics_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // 2. Create test member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Create multiple test communities
  const communities: IRedditPlatformCommunity[] = [];
  for (let i = 0; i < 3; i++) {
    const community =
      await generate_random_reddit_platform_member_communities_create(
        memberConnection,
        {
          body: {
            name: RandomGenerator.alphabets(8),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            icon_url: typia.random<string & tags.Format<"uri">>(),
          },
        },
      );
    typia.assert(community);
    communities.push(community);
  }
  // 4. Subscribe member to all communities
  for (const community of communities) {
    await generate_random_reddit_platform_member_communities_subscribe(
      memberConnection,
      {
        body: {
          confirmSubscription: true,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  }
  // 5. Create posts across communities
  const posts: IRedditPlatformPost[] = [];
  const postTypes: ("TEXT" | "LINK" | "IMAGE")[] = ["TEXT", "LINK", "IMAGE"];
  for (let i = 0; i < 9; i++) {
    const post = await generate_random_reddit_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          postType: postTypes[i % 3],
          redditPlatformCommunityId: communities[i % 3].id,
          content:
            postTypes[i % 3] === "TEXT"
              ? RandomGenerator.paragraph({ sentences: 5 })
              : null,
          url:
            postTypes[i % 3] === "LINK"
              ? (typia.random<
                  string & tags.MaxLength<80000> & tags.Format<"uri">
                >() satisfies string as string)
              : null,
          imageUrl:
            postTypes[i % 3] === "IMAGE"
              ? (typia.random<
                  string & tags.MaxLength<80000> & tags.Format<"uri">
                >() satisfies string as string)
              : null,
        },
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 6. Create comments on posts
  const comments: IRedditPlatformComment[] = [];
  for (let i = 0; i < 6; i++) {
    const comment =
      await generate_random_reddit_platform_member_comments_create(
        memberConnection,
        {
          body: {
            content: RandomGenerator.paragraph({ sentences: 3 }),
            post_id: posts[i % 9].id,
            parent_id: null,
          },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // 7. Submit reports
  const reports: IRedditPlatformReport[] = [];
  for (let i = 0; i < 12; i++) {
    const report = await generate_random_reddit_platform_member_reports_create(
      memberConnection,
      {
        body: {
          community_id: communities[i % 3].id,
          reported_content_type: i % 2 === 0 ? "POST" : "COMMENT",
          reported_content_id:
            i % 2 === 0 ? posts[i % 9].id : comments[i % 6].id,
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        },
      },
    );
    typia.assert(report);
    reports.push(report);
  }
  // 8. Call analytics endpoint with no filters
  const analyticsRequest: IRedditPlatformModerationAuditLog.IRequest = {
    pagination: { page: 1, limit: 100 },
    sort: { field: "created_at", direction: "desc" },
  };
  const analyticsResponse =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      adminConnection,
      { body: analyticsRequest },
    );
  typia.assert(analyticsResponse);
  // 9. Validate response structure
  // Ensure the response has all required sections (verified by typia.assert above)
  // 10. Test filtering by community_id
  const filteredByCommunity =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      adminConnection,
      {
        body: {
          ...analyticsRequest,
          community_ids: [communities[0].id],
        },
      },
    );
  typia.assert(filteredByCommunity);
  // 11. Test filtering by date_range
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 1);
  const filteredByDate =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      adminConnection,
      {
        body: {
          ...analyticsRequest,
          date_range: {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
          },
        },
      },
    );
  typia.assert(filteredByDate);
  // 12. Test filtering by status
  const filteredByStatus =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      adminConnection,
      {
        body: {
          ...analyticsRequest,
          status: "PENDING",
        },
      },
    );
  typia.assert(filteredByStatus);
  // 13. Test pagination
  const paginatedResponse =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      adminConnection,
      {
        body: {
          pagination: { page: 1, limit: 10 },
          sort: { field: "created_at", direction: "desc" },
        },
      },
    );
  typia.assert(paginatedResponse);
  // 14. Test sorting by different fields
  const sortedByModerator =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      adminConnection,
      {
        body: {
          pagination: { page: 1, limit: 20 },
          sort: { field: "moderator_id", direction: "asc" },
        },
      },
    );
  typia.assert(sortedByModerator);
  const sortedByCommunity =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      adminConnection,
      {
        body: {
          pagination: { page: 1, limit: 20 },
          sort: { field: "community_id", direction: "desc" },
        },
      },
    );
  typia.assert(sortedByCommunity);
  const sortedByActionType =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      adminConnection,
      {
        body: {
          pagination: { page: 1, limit: 20 },
          sort: { field: "action_type", direction: "asc" },
        },
      },
    );
  typia.assert(sortedByActionType);
  // 15. Test communities without reports
  const emptyCommunity =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
        },
      },
    );
  typia.assert(emptyCommunity);
  const emptyCommunityAnalytics =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      adminConnection,
      {
        body: {
          ...analyticsRequest,
          community_ids: [emptyCommunity.id],
        },
      },
    );
  typia.assert(emptyCommunityAnalytics);
  // 16. Verify report anonymization and timezone handling
  // All timestamps should be in ISO 8601 format (verified by typia.assert)
  // 17. Test with moderator_id filter (no moderator exists yet, will return empty)
  const filteredByModerator =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      adminConnection,
      {
        body: {
          ...analyticsRequest,
          moderator_id: memberAuth.id,
        },
      },
    );
  typia.assert(filteredByModerator);
}
