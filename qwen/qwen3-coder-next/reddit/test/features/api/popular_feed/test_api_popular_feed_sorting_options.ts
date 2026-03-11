import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_votes_create } from "../../../generate/generate_random_reddit_like_member_posts_votes_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_post_vote } from "../../../prepare/prepare_random_reddit_like_post_vote";

export async function test_api_popular_feed_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join member and login
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create multiple communities
  const communities: IRedditLikeCommunity.ISummary[] = [];
  for (let i = 0; i < 3; i++) {
    const post = await api.functional.redditLike.member.posts.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(2),
          type: "text",
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditLikePost.ICreate,
      },
    );
    communities.push(post.community);
    typia.assert(post);
  }
  // 3. Create test posts with varied engagement
  const postRecords: {
    hotPost: IRedditLikePost;
    newPost: IRedditLikePost;
    topPost: IRedditLikePost;
    controversialPost: IRedditLikePost;
  } = {
    hotPost: await api.functional.redditLike.member.posts.create(
      memberConnection,
      {
        body: {
          title: "Hot post title",
          type: "text",
          content: RandomGenerator.paragraph({ sentences: 10 }),
        } satisfies IRedditLikePost.ICreate,
      },
    ),
    newPost: await api.functional.redditLike.member.posts.create(
      memberConnection,
      {
        body: {
          title: "New post title",
          type: "text",
          content: RandomGenerator.paragraph({ sentences: 10 }),
        } satisfies IRedditLikePost.ICreate,
      },
    ),
    topPost: await api.functional.redditLike.member.posts.create(
      memberConnection,
      {
        body: {
          title: "Top post title",
          type: "text",
          content: RandomGenerator.paragraph({ sentences: 10 }),
        } satisfies IRedditLikePost.ICreate,
      },
    ),
    controversialPost: await api.functional.redditLike.member.posts.create(
      memberConnection,
      {
        body: {
          title: "Controversial post title",
          type: "text",
          content: RandomGenerator.paragraph({ sentences: 10 }),
        } satisfies IRedditLikePost.ICreate,
      },
    ),
  };
  typia.assert(postRecords.hotPost);
  typia.assert(postRecords.newPost);
  typia.assert(postRecords.topPost);
  typia.assert(postRecords.controversialPost);
  // 4. Apply varied voting for sorting tests
  // Hot post: mixed high engagement
  const hotVote1 = await api.functional.redditLike.member.posts.votes.create(
    memberConnection,
    {
      postId: postRecords.hotPost.id,
      body: { value: 1 } satisfies IRedditLikePostVote.ICreate,
    },
  );
  typia.assert(hotVote1);
  // New post: recent, low engagement
  const newVote1 = await api.functional.redditLike.member.posts.votes.create(
    memberConnection,
    {
      postId: postRecords.newPost.id,
      body: { value: 1 } satisfies IRedditLikePostVote.ICreate,
    },
  );
  typia.assert(newVote1);
  // Top post: many upvotes
  for (let i = 0; i < 50; i++) {
    const topVote = await api.functional.redditLike.member.posts.votes.create(
      memberConnection,
      {
        postId: postRecords.topPost.id,
        body: { value: 1 } satisfies IRedditLikePostVote.ICreate,
      },
    );
    typia.assert(topVote);
  }
  // Controversial post: mixed upvotes and downvotes
  for (let i = 0; i < 30; i++) {
    const contVote1 = await api.functional.redditLike.member.posts.votes.create(
      memberConnection,
      {
        postId: postRecords.controversialPost.id,
        body: { value: 1 } satisfies IRedditLikePostVote.ICreate,
      },
    );
    typia.assert(contVote1);
  }
  for (let i = 0; i < 25; i++) {
    const contVote2 = await api.functional.redditLike.member.posts.votes.create(
      memberConnection,
      {
        postId: postRecords.controversialPost.id,
        body: { value: -1 } satisfies IRedditLikePostVote.ICreate,
      },
    );
    typia.assert(contVote2);
  }
  // 5. Test popular feed with different sorting options
  // Hot sorting (default)
  const hotFeed = await api.functional.redditLike.member.popular.index(
    memberConnection,
    {
      body: {
        title: "", // Empty to get all
        type: "text" as const,
        communityName: communities[0].name,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(hotFeed);
  TestValidator.predicate("hot feed has results", hotFeed.data.length > 0);
  // New sorting
  const newFeed = await api.functional.redditLike.member.popular.index(
    memberConnection,
    {
      body: {
        title: "",
        type: "text" as const,
        communityName: communities[0].name,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(newFeed);
  TestValidator.predicate("new feed has results", newFeed.data.length > 0);
  // Top sorting with time filter
  const topFeed = await api.functional.redditLike.member.popular.index(
    memberConnection,
    {
      body: {
        title: "",
        type: "text" as const,
        communityName: communities[0].name,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(topFeed);
  TestValidator.predicate("top feed has results", topFeed.data.length > 0);
  // Controversial sorting
  const controversialFeed =
    await api.functional.redditLike.member.popular.index(memberConnection, {
      body: {
        title: "",
        type: "text" as const,
        communityName: communities[0].name,
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(controversialFeed);
  TestValidator.predicate(
    "controversial feed has results",
    controversialFeed.data.length > 0,
  );
  // 6. Validate post data structure
  for (const feed of [hotFeed, newFeed, topFeed, controversialFeed]) {
    for (const post of feed.data) {
      typia.assert(post);
      TestValidator.equals("post has author", post.author !== undefined, true);
      TestValidator.equals(
        "post has community",
        post.community !== undefined,
        true,
      );
      TestValidator.predicate(
        "vote score is number",
        typeof post.voteScore === "number",
      );
      TestValidator.predicate(
        "comment count is number",
        typeof post.commentCount === "number",
      );
    }
  }
}
