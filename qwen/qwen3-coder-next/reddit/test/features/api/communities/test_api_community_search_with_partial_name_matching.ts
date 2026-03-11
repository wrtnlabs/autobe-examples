import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_community_search_with_partial_name_matching(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare test communities with varied names
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  const community1 =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: "Technology",
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community1);
  const community2 =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: "TechNews",
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community2);
  const community3 =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: "techhub",
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community3);
  const community4 =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: "NonTechCommunity",
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community4);
  // 2. Search with partial name 'tech' - expect case-insensitive matching
  const searchResult = await api.functional.redditLike.communities.index(
    memberConnection,
    {
      body: {
        name: "tech",
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(searchResult);
  // 3. Validate search results
  TestValidator.equals("results count", searchResult.data.length, 3);
  TestValidator.predicate("contains Technology", () =>
    searchResult.data.some((c) => c.name === "Technology"),
  );
  TestValidator.predicate("contains TechNews", () =>
    searchResult.data.some((c) => c.name === "TechNews"),
  );
  TestValidator.predicate("contains techhub", () =>
    searchResult.data.some((c) => c.name === "techhub"),
  );
  TestValidator.predicate(
    "does not contain NonTechCommunity",
    () => !searchResult.data.some((c) => c.name === "NonTechCommunity"),
  );
  // 4. Verify pagination structure
  TestValidator.equals(
    "pagination.current",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination.limit", searchResult.pagination.limit, 20);
  TestValidator.equals(
    "pagination.records",
    searchResult.pagination.records,
    3,
  );
  TestValidator.equals("pagination.pages", searchResult.pagination.pages, 1);
  // 5. Test pagination configuration
  const limitedResult = await api.functional.redditLike.communities.index(
    memberConnection,
    {
      body: {
        name: "tech",
        limit: 2,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(limitedResult);
  TestValidator.equals(
    "limited pagination.limit",
    limitedResult.pagination.limit,
    2,
  );
  TestValidator.equals(
    "limited pagination.records",
    limitedResult.pagination.records,
    3,
  );
  TestValidator.equals(
    "limited pagination.pages",
    limitedResult.pagination.pages,
    2,
  );
}
