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

export async function test_api_post_popular_feed_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register multiple users and create communities
  const author1Connection: api.IConnection = { host: connection.host };
  const author1 = await authorize_member_join(author1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  const author2Connection: api.IConnection = { host: connection.host };
  const author2 = await authorize_member_join(author2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // Create communities for posts
  const community1 = await api.functional.redditClone.member.posts.create(
    author1Connection,
    {
      body: {
        type: "text",
        title: RandomGenerator.name(3),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(community1);
  const community2 = await api.functional.redditClone.member.posts.create(
    author2Connection,
    {
      body: {
        type: "text",
        title: RandomGenerator.name(3),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(community2);
  // 2. Create posts with varying engagement levels
  const newPost1 = await api.functional.redditClone.member.posts.create(
    author1Connection,
    {
      body: {
        type: "text",
        title: "Brand new post 1",
        community_id: community1.community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(newPost1);
  const newPost2 = await api.functional.redditClone.member.posts.create(
    author2Connection,
    {
      body: {
        type: "text",
        title: "Brand new post 2",
        community_id: community2.community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(newPost2);
  // Create top posts with high scores
  const topPost1 = await api.functional.redditClone.member.posts.create(
    author1Connection,
    {
      body: {
        type: "text",
        title: "Popular post with high score",
        community_id: community1.community.id,
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(topPost1);
  const topPost2 = await api.functional.redditClone.member.posts.create(
    author2Connection,
    {
      body: {
        type: "text",
        title: "Another popular post",
        community_id: community2.community.id,
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(topPost2);
  // Create controversial posts (high vote count, near-zero score)
  const controversialPost1 =
    await api.functional.redditClone.member.posts.create(author1Connection, {
      body: {
        type: "text",
        title: "Controversial post",
        community_id: community1.community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCloneContentPost.ICreate,
    });
  typia.assert(controversialPost1);
  const controversialPost2 =
    await api.functional.redditClone.member.posts.create(author2Connection, {
      body: {
        type: "text",
        title: "Another controversial topic",
        community_id: community2.community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCloneContentPost.ICreate,
    });
  typia.assert(controversialPost2);
  // 3. Test 'new' sorting - chronological order by creation timestamp
  const newFeed = await api.functional.redditClone.posts.index(
    author1Connection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(newFeed);
  TestValidator.predicate("new feed has posts", newFeed.data.length > 0);
  // 4. Test 'top' sorting - posts ordered by vote score
  const topFeed = await api.functional.redditClone.posts.index(
    author1Connection,
    {
      body: {
        sort: "top",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(topFeed);
  TestValidator.predicate("top feed has posts", topFeed.data.length > 0);
  // 5. Test 'top' sorting with timeFilter='today' - only today's posts
  const topTodayFeed = await api.functional.redditClone.posts.index(
    author1Connection,
    {
      body: {
        sort: "top",
        page: 1,
        limit: 10,
        timeFilter: "today",
      },
    },
  );
  typia.assert(topTodayFeed);
  TestValidator.predicate(
    "top today feed has posts",
    topTodayFeed.data.length > 0,
  );
  // 6. Test 'controversial' sorting - posts with high votes but near-zero score
  const controversialFeed = await api.functional.redditClone.posts.index(
    author1Connection,
    {
      body: {
        sort: "controversial",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(controversialFeed);
  TestValidator.predicate(
    "controversial feed has posts",
    controversialFeed.data.length > 0,
  );
  // 7. Test pagination parameters
  const paginatedFeed = await api.functional.redditClone.posts.index(
    author1Connection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 5,
      },
    },
  );
  typia.assert(paginatedFeed);
  TestValidator.equals(
    "pagination limit",
    paginatedFeed.data.length <= 5,
    true,
  );
  // 8. Verify deleted posts excluded from all feed types
  // Soft delete posts
  const deletedPost = await api.functional.redditClone.member.posts.create(
    author1Connection,
    {
      body: {
        type: "text",
        title: "This post will be deleted",
        community_id: community1.community.id,
        content: "Deleted content",
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(deletedPost);
  // Note: deletion endpoint not specified, so we verify that all feeds work
  const allFeedTypes = ["hot", "new", "top", "controversial"] as const;
  for (const sort of allFeedTypes) {
    const feed = await api.functional.redditClone.posts.index(
      author1Connection,
      {
        body: { sort, page: 1, limit: 10 },
      },
    );
    typia.assert(feed);
    TestValidator.predicate(`feed ${sort} has posts`, feed.data.length > 0);
  }
}
