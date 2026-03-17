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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

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

export async function test_api_post_statistics_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create community
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
  // Subscribe to community
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
  // Create text post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT" as const,
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Wait a moment for system to record statistics (simulate view activity)
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Test 1: Retrieve all-time statistics (no date filters)
  const allTimeStats = await api.functional.communityPlatform.posts.statistics(
    memberConnection,
    {
      postId: post.id,
      body: {} satisfies ICommunityPlatformPostViewStat.IRequest,
    },
  );
  typia.assert(allTimeStats);
  TestValidator.predicate(
    "all-time stats should have post reference",
    allTimeStats.post.id === post.id,
  );
  // Test 2: Retrieve with specific date range (today)
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).toISOString();
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  ).toISOString();
  const todayStats = await api.functional.communityPlatform.posts.statistics(
    memberConnection,
    {
      postId: post.id,
      body: {
        start_date: todayStart satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
        end_date: todayEnd satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
      } satisfies ICommunityPlatformPostViewStat.IRequest,
    },
  );
  typia.assert(todayStats);
  TestValidator.predicate(
    "today stats should have post reference",
    todayStats.post.id === post.id,
  );
  // Test 3: Edge case - start_date without end_date (should include from start_date to now)
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOnlyStats =
    await api.functional.communityPlatform.posts.statistics(memberConnection, {
      postId: post.id,
      body: {
        start_date: pastDate satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
      } satisfies ICommunityPlatformPostViewStat.IRequest,
    });
  typia.assert(startOnlyStats);
  TestValidator.predicate(
    "start-only stats should have post reference",
    startOnlyStats.post.id === post.id,
  );
  // Test 4: Edge case - end_date without start_date (should include from beginning to end_date)
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const endOnlyStats = await api.functional.communityPlatform.posts.statistics(
    memberConnection,
    {
      postId: post.id,
      body: {
        end_date: futureDate satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
      } satisfies ICommunityPlatformPostViewStat.IRequest,
    },
  );
  typia.assert(endOnlyStats);
  TestValidator.predicate(
    "end-only stats should have post reference",
    endOnlyStats.post.id === post.id,
  );
  // Test 5: Invalid date range - end_date before start_date should be rejected
  const invalidEndDate = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const invalidStartDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  await TestValidator.error(
    "invalid date range should be rejected",
    async () => {
      await api.functional.communityPlatform.posts.statistics(
        memberConnection,
        {
          postId: post.id,
          body: {
            start_date: invalidStartDate satisfies string &
              tags.Format<"date-time"> as string & tags.Format<"date-time">,
            end_date: invalidEndDate satisfies string &
              tags.Format<"date-time"> as string & tags.Format<"date-time">,
          } satisfies ICommunityPlatformPostViewStat.IRequest,
        },
      );
    },
  );
  // Test 6: Test actor_type filter
  const memberStats = await api.functional.communityPlatform.posts.statistics(
    memberConnection,
    {
      postId: post.id,
      body: {
        actor_type: "member" as const,
      } satisfies ICommunityPlatformPostViewStat.IRequest,
    },
  );
  typia.assert(memberStats);
  TestValidator.equals(
    "actor_type should be member",
    memberStats.actor_type,
    "member",
  );
  // Test 7: Test pagination with date filter
  const paginatedStats =
    await api.functional.communityPlatform.posts.statistics(memberConnection, {
      postId: post.id,
      body: {
        start_date: pastDate satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
        page: 1 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> as number,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100> as number,
      } satisfies ICommunityPlatformPostViewStat.IRequest,
    });
  typia.assert(paginatedStats);
  TestValidator.predicate(
    "paginated stats should have post reference",
    paginatedStats.post.id === post.id,
  );
}
