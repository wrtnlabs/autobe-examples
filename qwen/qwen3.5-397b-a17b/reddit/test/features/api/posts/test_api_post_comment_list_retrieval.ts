import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_post_comment_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create three member accounts with separate connections
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member1Auth);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member2Auth);
  const member3Connection: api.IConnection = { host: connection.host };
  const member3Auth = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member3Auth);
  // 2. First member creates a community
  const community = await generate_random_reddit_clone_communities_create(
    member1Connection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 3. First member subscribes to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      member1Connection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. First member creates a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Each member creates a top-level comment on the post
  const comment1 =
    await generate_random_reddit_clone_member_posts_comments_create(
      member1Connection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(comment1);
  // Small delay to ensure different timestamps for sorting validation
  await new Promise((resolve) => setTimeout(resolve, 100));
  const comment2 =
    await generate_random_reddit_clone_member_posts_comments_create(
      member2Connection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(comment2);
  // Small delay to ensure different timestamps for sorting validation
  await new Promise((resolve) => setTimeout(resolve, 100));
  const comment3 =
    await generate_random_reddit_clone_member_posts_comments_create(
      member3Connection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(comment3);
  // 6. Retrieve comments using PATCH endpoint with default parameters
  const commentList = await api.functional.redditClone.posts.comments.index(
    member1Connection,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 20,
        sort: "new",
      } satisfies IRedditCloneComment.IRequest,
    },
  );
  typia.assert(commentList);
  // 7. Validate pagination metadata
  TestValidator.equals("total records", commentList.pagination.records, 3);
  TestValidator.equals("current page", commentList.pagination.current, 1);
  TestValidator.equals("page limit", commentList.pagination.limit, 20);
  TestValidator.equals("total pages", commentList.pagination.pages, 1);
  // 8. Validate all three comments are returned
  TestValidator.equals("comment count", commentList.data.length, 3);
  // 9. Validate comments are sorted by creation date descending (newest first)
  const commentIds = commentList.data.map((c) => c.id);
  TestValidator.equals("newest comment first", commentIds[0], comment3.id);
  TestValidator.equals("second comment", commentIds[1], comment2.id);
  TestValidator.equals("oldest comment last", commentIds[2], comment1.id);
  // 10. Validate each comment has required fields
  for (const comment of commentList.data) {
    // Author information exists
    TestValidator.predicate("has author", comment.author !== undefined);
    TestValidator.predicate(
      "author has username",
      comment.author.username.length > 0,
    );
    // Vote score exists (can be 0 for new comments)
    TestValidator.predicate(
      "has vote score",
      typeof comment.vote_score === "number",
    );
    // Reply count exists
    TestValidator.predicate(
      "has reply count",
      typeof comment.reply_count === "number",
    );
    TestValidator.equals("reply count is 0", comment.reply_count, 0);
    // Creation timestamp exists
    TestValidator.predicate("has created_at", comment.created_at.length > 0);
    // Parent is null for top-level comments
    TestValidator.equals("parent is null", comment.parent, null);
    // Post reference exists
    TestValidator.predicate("has post reference", comment.post !== undefined);
    TestValidator.equals("post id matches", comment.post.id, post.id);
  }
  // 11. Validate comment bodies match what was created
  const bodies = commentList.data.map((c) => c.body);
  TestValidator.predicate(
    "comment1 body exists",
    bodies.includes(comment1.body),
  );
  TestValidator.predicate(
    "comment2 body exists",
    bodies.includes(comment2.body),
  );
  TestValidator.predicate(
    "comment3 body exists",
    bodies.includes(comment3.body),
  );
}
