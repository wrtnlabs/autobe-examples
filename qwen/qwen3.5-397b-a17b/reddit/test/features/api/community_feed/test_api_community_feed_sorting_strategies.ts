import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_vote } from "../../../generate/generate_random_reddit_clone_member_posts_vote";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";

export async function test_api_community_feed_sorting_strategies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner and community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(owner);
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 2. Create additional members for voting
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member2);
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member3);
  // 3. Create posts with different characteristics for sorting validation
  // Post 1: High positive score (many upvotes)
  const post1 = await generate_random_reddit_clone_member_posts_create(
    ownerConnection,
    {
      body: {
        title: "High Score Post",
        post_type: "TEXT",
        community_id: community.id,
        text: { body: RandomGenerator.paragraph({ sentences: 3 }) },
      },
    },
  );
  typia.assert(post1);
  // Post 2: Medium positive score
  const post2 = await generate_random_reddit_clone_member_posts_create(
    ownerConnection,
    {
      body: {
        title: "Medium Score Post",
        post_type: "TEXT",
        community_id: community.id,
        text: { body: RandomGenerator.paragraph({ sentences: 3 }) },
      },
    },
  );
  typia.assert(post2);
  // Post 3: Low/negative score (for controversial testing)
  const post3 = await generate_random_reddit_clone_member_posts_create(
    ownerConnection,
    {
      body: {
        title: "Controversial Post",
        post_type: "TEXT",
        community_id: community.id,
        text: { body: RandomGenerator.paragraph({ sentences: 3 }) },
      },
    },
  );
  typia.assert(post3);
  // Post 4: Another post for new sorting (created last)
  const post4 = await generate_random_reddit_clone_member_posts_create(
    ownerConnection,
    {
      body: {
        title: "Newest Post",
        post_type: "TEXT",
        community_id: community.id,
        text: { body: RandomGenerator.paragraph({ sentences: 3 }) },
      },
    },
  );
  typia.assert(post4);
  // 4. Cast votes to create different score patterns
  // Post 1: 3 upvotes (high positive)
  await generate_random_reddit_clone_member_posts_vote(member2Connection, {
    params: { postId: post1.id },
    body: { vote_type: "UPVOTE" },
  });
  await generate_random_reddit_clone_member_posts_vote(member3Connection, {
    params: { postId: post1.id },
    body: { vote_type: "UPVOTE" },
  });
  // Post 2: 1 upvote (medium positive)
  await generate_random_reddit_clone_member_posts_vote(member2Connection, {
    params: { postId: post2.id },
    body: { vote_type: "UPVOTE" },
  });
  // Post 3: Mixed votes (controversial - high vote count, score near zero)
  await generate_random_reddit_clone_member_posts_vote(member2Connection, {
    params: { postId: post3.id },
    body: { vote_type: "UPVOTE" },
  });
  await generate_random_reddit_clone_member_posts_vote(member3Connection, {
    params: { postId: post3.id },
    body: { vote_type: "DOWNVOTE" },
  });
  // 5. Test NEW sorting (most recent first)
  const newFeed = await api.functional.redditClone.communities.feed.index(
    ownerConnection,
    {
      communityId: community.id,
      body: {
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(newFeed);
  TestValidator.predicate("new feed has posts", newFeed.data.length >= 4);
  // Verify newest post appears first in new sorting
  if (newFeed.data.length > 0) {
    TestValidator.predicate(
      "newest post first in new sort",
      newFeed.data[0].id === post4.id ||
        new Date(newFeed.data[0].created_at) >=
          new Date(newFeed.data[1].created_at),
    );
  }
  // 6. Test TOP sorting (highest vote score first)
  const topFeed = await api.functional.redditClone.communities.feed.index(
    ownerConnection,
    {
      communityId: community.id,
      body: {
        sort: "top",
        timeFilter: "all_time",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(topFeed);
  TestValidator.predicate("top feed has posts", topFeed.data.length >= 4);
  // Verify highest scored post appears first in top sorting
  if (topFeed.data.length > 1) {
    TestValidator.predicate(
      "highest score first in top sort",
      topFeed.data[0].vote_score >= topFeed.data[1].vote_score,
    );
  }
  // 7. Test HOT sorting (engagement-based)
  const hotFeed = await api.functional.redditClone.communities.feed.index(
    ownerConnection,
    {
      communityId: community.id,
      body: {
        sort: "hot",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(hotFeed);
  TestValidator.predicate("hot feed has posts", hotFeed.data.length >= 4);
  // 8. Test CONTROVERSIAL sorting (high vote count, score near zero)
  const controversialFeed =
    await api.functional.redditClone.communities.feed.index(ownerConnection, {
      communityId: community.id,
      body: {
        sort: "controversial",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(controversialFeed);
  TestValidator.predicate(
    "controversial feed has posts",
    controversialFeed.data.length >= 4,
  );
  // 9. Test pagination with new sorting
  const paginatedFeed = await api.functional.redditClone.communities.feed.index(
    ownerConnection,
    {
      communityId: community.id,
      body: {
        sort: "new",
        page: 1,
        limit: 2,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(paginatedFeed);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedFeed.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination info present",
    paginatedFeed.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records count",
    paginatedFeed.pagination.records >= 4,
  );
}
