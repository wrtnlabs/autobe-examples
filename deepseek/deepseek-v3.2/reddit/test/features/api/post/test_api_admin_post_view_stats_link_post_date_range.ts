import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformPostViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostViewStat";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostViewStat";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_admin_post_view_stats_link_post_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Subscribe to community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5. Create link post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        community_name: community.name,
        content_type: "LINK" as const,
        content_link: {
          url: typia.random<
            string & tags.Format<"url"> & tags.MaxLength<80000>
          >(),
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          thumbnail_url: typia.random<
            string & tags.Format<"url"> & tags.MaxLength<80000>
          >(),
        } satisfies ICommunityPlatformPostLink.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Define date range for filtering
  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day in future
  // 7. Retrieve view stats with date range filter
  const statsPage1 =
    await api.functional.communityPlatform.admin.posts.view_stats.index(
      adminConnection,
      {
        postId: post.id,
        body: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostViewStat.IRequest,
      },
    );
  typia.assert(statsPage1);
  // 8. Test pagination with second page
  const statsPage2 =
    await api.functional.communityPlatform.admin.posts.view_stats.index(
      adminConnection,
      {
        postId: post.id,
        body: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformPostViewStat.IRequest,
      },
    );
  typia.assert(statsPage2);
  // 9. Test actor_type filtering with date range
  const memberStats =
    await api.functional.communityPlatform.admin.posts.view_stats.index(
      adminConnection,
      {
        postId: post.id,
        body: {
          actor_type: "member",
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostViewStat.IRequest,
      },
    );
  typia.assert(memberStats);
  // 10. Test guest actor_type filtering with date range
  const guestStats =
    await api.functional.communityPlatform.admin.posts.view_stats.index(
      adminConnection,
      {
        postId: post.id,
        body: {
          actor_type: "guest",
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostViewStat.IRequest,
      },
    );
  typia.assert(guestStats);
  // 11. Validate pagination metadata
  TestValidator.predicate(
    "pagination should have valid metadata",
    statsPage1.pagination.current === 1 &&
      statsPage1.pagination.limit === 10 &&
      statsPage1.pagination.records >= 0 &&
      statsPage1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "second page pagination should have valid metadata",
    statsPage2.pagination.current === 2 &&
      statsPage2.pagination.limit === 5 &&
      statsPage2.pagination.records >= 0 &&
      statsPage2.pagination.pages >= 0,
  );
  // 12. Validate actor_type filtering
  if (memberStats.data.length > 0) {
    for (const stat of memberStats.data) {
      TestValidator.equals(
        "member stats should have actorType 'member'",
        stat.actorType,
        "member",
      );
    }
  }
  if (guestStats.data.length > 0) {
    for (const stat of guestStats.data) {
      TestValidator.equals(
        "guest stats should have actorType 'guest'",
        stat.actorType,
        "guest",
      );
    }
  }
  // 13. Validate post reference in stats
  if (statsPage1.data.length > 0) {
    for (const stat of statsPage1.data) {
      TestValidator.equals(
        "stat should reference the correct post",
        stat.post.id,
        post.id,
      );
    }
  }
}
