import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostFeed";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Validate pagination functionality of the popular feed endpoint.
 * Tests default pagination, custom pagination, and boundary conditions.
 */
export async function test_api_popular_feed_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - Create authenticated member
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
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Test default pagination (page=1, limit=20)
  const defaultResponse =
    await api.functional.redditPlatform.feeds.popular.index(memberConnection, {
      body: {
        feedType: "POPULAR",
        sortType: "HOT",
      },
    });
  typia.assert(defaultResponse);
  // Validate default pagination metadata
  TestValidator.equals(
    "default current page",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals("default limit", defaultResponse.pagination.limit, 20);
  TestValidator.predicate(
    "default records non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.equals(
    "default pages calculation",
    defaultResponse.pagination.pages,
    Math.ceil(
      defaultResponse.pagination.records / defaultResponse.pagination.limit,
    ),
  );
  // 3. Test custom pagination (page=3, limit=50)
  const customResponse =
    await api.functional.redditPlatform.feeds.popular.index(memberConnection, {
      body: {
        feedType: "POPULAR",
        sortType: "HOT",
        page: 3,
        limit: 50,
      },
    });
  typia.assert(customResponse);
  // Validate custom pagination metadata
  TestValidator.equals(
    "custom current page",
    customResponse.pagination.current,
    3,
  );
  TestValidator.equals("custom limit", customResponse.pagination.limit, 50);
  TestValidator.predicate(
    "custom records non-negative",
    customResponse.pagination.records >= 0,
  );
  TestValidator.equals(
    "custom pages calculation",
    customResponse.pagination.pages,
    Math.ceil(
      customResponse.pagination.records / customResponse.pagination.limit,
    ),
  );
  // 4. Test boundary condition - page beyond total
  const maxPage = customResponse.pagination.pages + 10;
  const beyondPageResponse =
    await api.functional.redditPlatform.feeds.popular.index(memberConnection, {
      body: {
        feedType: "POPULAR",
        sortType: "HOT",
        page: maxPage,
        limit: 20,
      },
    });
  typia.assert(beyondPageResponse);
  // Verify empty data array for beyond total pages
  TestValidator.equals(
    "beyond page has empty data",
    beyondPageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page pagination current",
    beyondPageResponse.pagination.current,
    maxPage,
  );
  // 5. Test maximum limit (100)
  const maxLimitResponse =
    await api.functional.redditPlatform.feeds.popular.index(memberConnection, {
      body: {
        feedType: "POPULAR",
        sortType: "HOT",
        limit: 100,
      },
    });
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit pagination",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit data within bounds",
    maxLimitResponse.data.length <= 100,
  );
  // 6. Test minimum limit (1)
  const minLimitResponse =
    await api.functional.redditPlatform.feeds.popular.index(memberConnection, {
      body: {
        feedType: "POPULAR",
        sortType: "HOT",
        limit: 1,
      },
    });
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "min limit pagination",
    minLimitResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "min limit data within bounds",
    minLimitResponse.data.length <= 1,
  );
  // 7. Verify pagination consistency across different requests
  TestValidator.equals(
    "pagination records consistent",
    defaultResponse.pagination.records,
    customResponse.pagination.records,
  );
}
