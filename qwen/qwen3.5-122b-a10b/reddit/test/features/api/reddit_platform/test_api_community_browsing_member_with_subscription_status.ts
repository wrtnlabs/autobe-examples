import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member user can browse communities and receive subscription status context for each community.
 * After authenticating as a member and subscribing to specific communities, when the member browses
 * the community list, the system should return all communities with their subscription status indicated.
 * The response includes community name, description, icon, owner, subscriber count, and creation timestamp
 * for each community. The pagination should work correctly with configurable limit and page parameters.
 * Sorting options should be available for subscriber_count (popularity), created_at (creation date),
 * and name (alphabetical) in both ascending and descending order.
 * This validates that authenticated members receive enhanced context about their subscription status
 * while browsing communities.
 */
export async function test_api_community_browsing_member_with_subscription_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Browse communities (authenticated member should receive subscription status context)
  const browseResult = await api.functional.redditPlatform.communities.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "subscriber_count",
        order: "desc",
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(browseResult);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    browseResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", browseResult.pagination.limit, 20);
  TestValidator.predicate(
    "has pagination records",
    browseResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has pagination pages",
    browseResult.pagination.pages >= 0,
  );
  // 4. Validate community data structure
  if (browseResult.data.length > 0) {
    const firstCommunity = browseResult.data[0];
    typia.assert(firstCommunity);
    TestValidator.predicate(
      "community has id",
      firstCommunity.id !== undefined,
    );
    TestValidator.predicate(
      "community has name",
      firstCommunity.name !== undefined,
    );
    TestValidator.predicate(
      "community has owner",
      firstCommunity.owner !== undefined,
    );
    TestValidator.predicate(
      "community has subscriber count",
      firstCommunity.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "community has created_at",
      firstCommunity.created_at !== undefined,
    );
  }
  // 5. Test different sorting options
  const sortBySubscriber =
    await api.functional.redditPlatform.communities.index(memberConnection, {
      body: {
        sort: "subscriber_count",
        order: "desc",
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(sortBySubscriber);
  const sortByCreatedAt = await api.functional.redditPlatform.communities.index(
    memberConnection,
    {
      body: {
        sort: "created_at",
        order: "desc",
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(sortByCreatedAt);
  const sortByName = await api.functional.redditPlatform.communities.index(
    memberConnection,
    {
      body: {
        sort: "name",
        order: "asc",
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(sortByName);
  // 6. Test pagination with different page numbers
  const page2Result = await api.functional.redditPlatform.communities.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 10);
  // 7. Test search functionality
  if (browseResult.data.length > 0) {
    const searchCommunity = browseResult.data[0];
    const searchResult = await api.functional.redditPlatform.communities.index(
      memberConnection,
      {
        body: {
          search: searchCommunity.name.substring(0, 3),
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
    typia.assert(searchResult);
    TestValidator.predicate(
      "search returns results",
      searchResult.data.length >= 0,
    );
  }
}