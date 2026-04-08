import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_home_feed_empty_subscribed_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create authenticated connection with token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${member.token.access}`,
    },
  };
  // 3. Call home feed endpoint with default parameters
  const defaultFeed =
    await api.functional.redditPlatform.member.feeds.home.index(
      authenticatedConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(defaultFeed);
  // 4. Validate default response
  TestValidator.equals(
    "home feed empty data array",
    defaultFeed.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current page",
    defaultFeed.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", defaultFeed.pagination.limit, 20);
  TestValidator.equals(
    "pagination records count",
    defaultFeed.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count",
    defaultFeed.pagination.pages,
    0,
  );
  // 5. Test with hot sort
  const hotFeed = await api.functional.redditPlatform.member.feeds.home.index(
    authenticatedConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "hot" as const,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(hotFeed);
  TestValidator.equals("hot sort returns empty data", hotFeed.data.length, 0);
  TestValidator.equals(
    "hot sort pagination records",
    hotFeed.pagination.records,
    0,
  );
  // 6. Test with top sort
  const topFeed = await api.functional.redditPlatform.member.feeds.home.index(
    authenticatedConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "top" as const,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(topFeed);
  TestValidator.equals("top sort returns empty data", topFeed.data.length, 0);
  TestValidator.equals(
    "top sort pagination records",
    topFeed.pagination.records,
    0,
  );
  // 7. Test with controversial sort
  const controversialFeed =
    await api.functional.redditPlatform.member.feeds.home.index(
      authenticatedConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "controversial" as const,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(controversialFeed);
  TestValidator.equals(
    "controversial sort returns empty data",
    controversialFeed.data.length,
    0,
  );
  TestValidator.equals(
    "controversial sort pagination records",
    controversialFeed.pagination.records,
    0,
  );
  // 8. Test with pagination parameters (page=2, limit=5)
  const paginatedFeed =
    await api.functional.redditPlatform.member.feeds.home.index(
      authenticatedConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(paginatedFeed);
  TestValidator.equals(
    "paginated feed empty data array",
    paginatedFeed.data.length,
    0,
  );
  TestValidator.equals(
    "paginated feed current page",
    paginatedFeed.pagination.current,
    2,
  );
  TestValidator.equals(
    "paginated feed limit",
    paginatedFeed.pagination.limit,
    5,
  );
  TestValidator.equals(
    "paginated feed records count",
    paginatedFeed.pagination.records,
    0,
  );
  TestValidator.equals(
    "paginated feed pages count",
    paginatedFeed.pagination.pages,
    0,
  );
}
