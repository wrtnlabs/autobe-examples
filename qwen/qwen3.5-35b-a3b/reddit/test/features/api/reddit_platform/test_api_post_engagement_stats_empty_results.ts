import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostEngagementStat";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_engagement_stats_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a post to have some data in the system
  const post = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        postType: "TEXT",
        redditPlatformCommunityId:
          member.moderatorOfCommunities[0]?.id ??
          typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  // 3a. Test view_count > max possible value
  const highViewFilter: IRedditPlatformPostEngagementStat.IRequest = {
    min_view_count: 999999999,
  } satisfies IRedditPlatformPostEngagementStat.IRequest;
  const highViewResult =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: highViewFilter,
      },
    );
  typia.assert(highViewResult);
  TestValidator.equals(
    "high view count filter returns empty data",
    highViewResult.data.length,
    0,
  );
  TestValidator.equals(
    "high view count filter has correct pagination",
    highViewResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "high view count filter has correct pages",
    highViewResult.pagination.pages,
    0,
  );
  // 3b. Test non-existent post_id
  const nonExistentPostFilter: IRedditPlatformPostEngagementStat.IRequest = {
    post_id: nonExistentPostId,
  } satisfies IRedditPlatformPostEngagementStat.IRequest;
  const nonExistentPostResult =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: nonExistentPostFilter,
      },
    );
  typia.assert(nonExistentPostResult);
  TestValidator.equals(
    "non-existent post_id returns empty data",
    nonExistentPostResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent post_id has correct pagination",
    nonExistentPostResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent post_id has correct pages",
    nonExistentPostResult.pagination.pages,
    0,
  );
  // 3c. Test last_viewed_at time range filter
  const pastTimeFilter: IRedditPlatformPostEngagementStat.IRequest = {
    last_viewed_at_before: new Date(0).toISOString(), // January 1, 1970
  } satisfies IRedditPlatformPostEngagementStat.IRequest;
  const pastTimeResult =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: pastTimeFilter,
      },
    );
  typia.assert(pastTimeResult);
  TestValidator.equals(
    "past time filter returns empty data",
    pastTimeResult.data.length,
    0,
  );
  TestValidator.equals(
    "past time filter has correct pagination",
    pastTimeResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "past time filter has correct pages",
    pastTimeResult.pagination.pages,
    0,
  );
  // 4. Combine sort and pagination with empty results
  const sortedEmptyFilter: IRedditPlatformPostEngagementStat.IRequest = {
    min_view_count: 999999999,
    sort: "view_count" as const,
    order: "desc" as const,
    page: 1,
    limit: 10,
  } satisfies IRedditPlatformPostEngagementStat.IRequest;
  const sortedEmptyResult =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: sortedEmptyFilter,
      },
    );
  typia.assert(sortedEmptyResult);
  TestValidator.equals(
    "sorted empty filter returns empty data",
    sortedEmptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "sorted empty filter has correct pagination",
    sortedEmptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "sorted empty filter has correct pages",
    sortedEmptyResult.pagination.pages,
    0,
  );
}
