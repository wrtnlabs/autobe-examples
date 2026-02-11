import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_popular_feed_guest_all_time(
  connection: api.IConnection,
): Promise<void> {
  // Create anonymous connection (guest user)
  const guestConnection: api.IConnection = { host: connection.host };
  // Request popular feed with sortBy=new and timeFilter=all
  const response = await api.functional.redditCommunity.popular.index(
    guestConnection,
    {
      body: {
        sortBy: "new",
        timeFilter: "all",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  // Validate response structure
  typia.assert(response);
  // Validate pagination metadata matches request parameters
  TestValidator.equals("page number is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array is present
  TestValidator.predicate("data array is not empty", response.data.length > 0);
}
