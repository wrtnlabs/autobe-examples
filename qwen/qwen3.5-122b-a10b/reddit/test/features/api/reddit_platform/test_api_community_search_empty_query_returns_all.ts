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
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

/**
 * Test that an empty search query returns all active communities on the platform.
 * 1. Create multiple users
 * 2. Each user creates a community
 * 3. Search with empty query
 * 4. Verify all communities are returned
 * 5. Validate pagination metadata
 */
export async function test_api_community_search_empty_query_returns_all(
  connection: api.IConnection,
): Promise<void> {
  // Create first user and community
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Auth = await authorize_member_join(user1Connection, {
    body: typia.assert<IRedditPlatformMember.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    }),
  });
  typia.assert(user1Auth);
  const community1 =
    await generate_random_reddit_platform_member_communities_create(
      user1Connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  // Create second user and community
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Auth = await authorize_member_join(user2Connection, {
    body: typia.assert<IRedditPlatformMember.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    }),
  });
  typia.assert(user2Auth);
  const community2 =
    await generate_random_reddit_platform_member_communities_create(
      user2Connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // Create third user and community
  const user3Connection: api.IConnection = { host: connection.host };
  const user3Auth = await authorize_member_join(user3Connection, {
    body: typia.assert<IRedditPlatformMember.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    }),
  });
  typia.assert(user3Auth);
  const community3 =
    await generate_random_reddit_platform_member_communities_create(
      user3Connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community3);
  // Search with empty query
  const searchResult =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {
        search: "",
        page: 1,
        limit: 100,
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(searchResult);
  // Verify all communities are returned
  TestValidator.equals("community count", searchResult.data.length, 3);
  // Verify each community is in results
  const communityIds = searchResult.data.map((c) => c.id);
  TestValidator.predicate(
    "community1 in results",
    communityIds.includes(community1.id),
  );
  TestValidator.predicate(
    "community2 in results",
    communityIds.includes(community2.id),
  );
  TestValidator.predicate(
    "community3 in results",
    communityIds.includes(community3.id),
  );
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 100);
  TestValidator.equals(
    "pagination records",
    searchResult.pagination.records,
    3,
  );
  TestValidator.predicate(
    "pagination pages positive",
    searchResult.pagination.pages > 0,
  );
  // Verify community summary fields
  for (const community of searchResult.data) {
    typia.assert(community);
    TestValidator.predicate("has id", community.id !== undefined);
    TestValidator.predicate("has name", community.name !== undefined);
    TestValidator.predicate("has owner", community.owner !== undefined);
    TestValidator.predicate(
      "has subscriber_count",
      community.subscriber_count !== undefined,
    );
    TestValidator.predicate(
      "has created_at",
      community.created_at !== undefined,
    );
  }
}