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

export async function test_api_member_comments_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
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
  typia.assert(memberAuth);
  // 2. Create a community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe member to community (already subscribed as creator, but create explicit subscription)
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a post for comments
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
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
  // 5. Create multiple comments by the member on the post
  const commentCount = 5;
  const comments = await ArrayUtil.asyncRepeat(commentCount, async (index) => {
    const comment =
      await generate_random_reddit_clone_member_posts_comments_create(
        memberConnection,
        {
          body: {
            body: `Test comment ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
          } satisfies IRedditCloneComment.ICreate,
          params: {
            postId: post.id,
          },
        },
      );
    typia.assert(comment);
    return comment;
  });
  // 6. Retrieve member's comments with default pagination
  const result = await api.functional.redditClone.members.comments.index(
    memberConnection,
    {
      memberId: memberAuth.id,
      body: {
        page: 1,
        limit: 20,
        sort: "new",
      } satisfies IRedditCloneComment.IRequest,
    },
  );
  typia.assert(result);
  // 7. Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit", result.pagination.limit, 20);
  TestValidator.equals(
    "total records",
    result.pagination.records,
    commentCount,
  );
  TestValidator.equals(
    "total pages",
    result.pagination.pages,
    Math.ceil(commentCount / 20),
  );
  // 8. Validate comments are returned
  TestValidator.equals("comments count", result.data.length, commentCount);
  // 9. Validate each comment summary - business logic only (typia.assert already validated types)
  for (let i = 0; i < result.data.length; i++) {
    const comment = result.data[i];
    // Validate author information matches the member
    TestValidator.equals(
      "author id matches member",
      comment.author.id,
      memberAuth.id,
    );
    TestValidator.equals(
      "author username matches",
      comment.author.username,
      memberAuth.username,
    );
    // Validate post reference
    TestValidator.equals("post id matches", comment.post.id, post.id);
    TestValidator.equals("post title matches", comment.post.title, post.title);
    // Validate parent is null for top-level comments
    TestValidator.equals("parent is null", comment.parent, null);
    // Validate vote_score and reply_count are valid numbers
    TestValidator.predicate(
      "vote_score is non-negative",
      comment.vote_score >= 0,
    );
    TestValidator.predicate(
      "reply_count is non-negative",
      comment.reply_count >= 0,
    );
  }
  // 10. Validate comments are sorted by 'new' (most recent first)
  if (result.data.length > 1) {
    for (let i = 0; i < result.data.length - 1; i++) {
      const currentDate = new Date(result.data[i].created_at).getTime();
      const nextDate = new Date(result.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `comment ${i} is newer than or equal to comment ${i + 1}`,
        currentDate >= nextDate,
      );
    }
  }
}
