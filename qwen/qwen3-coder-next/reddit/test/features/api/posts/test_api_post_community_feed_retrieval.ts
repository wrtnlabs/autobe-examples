import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_content_post } from "../../../prepare/prepare_random_reddit_clone_content_post";

export async function test_api_post_community_feed_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two users
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@test.com",
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@test.com",
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Create posts as member1 (2 posts)
  const post1 = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        type: "text",
        title: RandomGenerator.name(3),
        community_id: member1.id, // Using user ID as community placeholder
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        type: "link",
        title: RandomGenerator.name(3),
        community_id: member1.id,
        url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(post2);
  // 3. Create post as member2
  const post3 = await generate_random_reddit_clone_member_posts_create(
    member2Connection,
    {
      body: {
        type: "text",
        title: RandomGenerator.name(3),
        community_id: member1.id,
        content: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(post3);
  // 4. Test community feed without authentication (should work)
  const nonAuthPosts = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneContentPost.IRequest,
    },
  );
  typia.assert(nonAuthPosts);
  // 5. Verify non-authenticated user can access feed
  TestValidator.equals("total posts matches", nonAuthPosts.data.length, 3);
  // 6. Test community feed with authentication (should work with same results)
  const member1Posts = await api.functional.redditClone.posts.index(
    member1Connection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneContentPost.IRequest,
    },
  );
  typia.assert(member1Posts);
  TestValidator.equals(
    "authenticated posts match",
    member1Posts.data.length,
    3,
  );
  // 7. Verify pagination with limit parameter
  const paginatedPosts = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 2,
      } satisfies IRedditCloneContentPost.IRequest,
    },
  );
  typia.assert(paginatedPosts);
  TestValidator.equals("first page limit", paginatedPosts.data.length, 2);
  TestValidator.equals("pagination limit", paginatedPosts.pagination.limit, 2);
  TestValidator.equals("total records", paginatedPosts.pagination.records, 3);
  TestValidator.equals("total pages", paginatedPosts.pagination.pages, 2);
  // 8. Test sorting algorithms
  const hotPosts = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "hot",
      page: 1,
      limit: 10,
    } satisfies IRedditCloneContentPost.IRequest,
  });
  typia.assert(hotPosts);
  const topPosts = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "top",
      page: 1,
      limit: 10,
      timeFilter: "allTime",
    } satisfies IRedditCloneContentPost.IRequest,
  });
  typia.assert(topPosts);
  const controversialPosts = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        sort: "controversial",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneContentPost.IRequest,
    },
  );
  typia.assert(controversialPosts);
}
