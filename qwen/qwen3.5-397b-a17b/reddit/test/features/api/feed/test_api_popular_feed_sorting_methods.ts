import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_popular_feed_sorting_methods(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test Hot Sorting (Default)
  const hotFeed =
    await api.functional.redditCommunity.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort: "hot",
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(hotFeed);
  TestValidator.equals("hot feed current page", hotFeed.pagination.current, 1);
  TestValidator.equals("hot feed limit", hotFeed.pagination.limit, 20);
  // 3. Test New Sorting
  const newFeed =
    await api.functional.redditCommunity.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort: "new",
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(newFeed);
  // 4. Test Top Sorting with Time Filters
  const timeFilters: Array<"today" | "week" | "month" | "year" | "all"> = [
    "today",
    "week",
    "month",
    "year",
    "all",
  ];
  for (const timeFilter of timeFilters) {
    const topFeed =
      await api.functional.redditCommunity.member.feeds.popular.index(
        memberConnection,
        {
          body: {
            sort: "top",
            timeFilter: timeFilter,
            page: 1,
            limit: 20,
          } satisfies IRedditCommunityPost.IRequest,
        },
      );
    typia.assert(topFeed);
  }
  // 5. Test Controversial Sorting
  const controversialFeed =
    await api.functional.redditCommunity.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort: "controversial",
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(controversialFeed);
  // 6. Validate Post Structure (using hot feed as example)
  if (hotFeed.data.length > 0) {
    const firstPost = hotFeed.data[0];
    typia.assert(firstPost);
    // typia.assert() performs complete validation of all fields and types
    // No need for redundant field existence checks
  }
  // 7. Validate Pagination Metadata
  // typia.assert(hotFeed) already validates pagination structure
  // Only test business logic values
  TestValidator.predicate(
    "pagination pages calculation is correct",
    hotFeed.pagination.pages ===
      Math.ceil(hotFeed.pagination.records / hotFeed.pagination.limit),
  );
}
