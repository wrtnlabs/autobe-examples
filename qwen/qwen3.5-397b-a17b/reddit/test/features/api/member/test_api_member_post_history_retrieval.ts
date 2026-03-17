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
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_member_post_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create requester member (authenticated member who will query posts)
  const requesterAuth = await authorize_member_join(connection, {
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
  typia.assert(requesterAuth);
  const requesterConnection: api.IConnection = { host: connection.host };
  requesterConnection.headers = { Authorization: requesterAuth.token.access };
  // 2. Create target member (whose posts will be retrieved)
  const targetAuth = await authorize_member_join(connection, {
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
  typia.assert(targetAuth);
  const targetConnection: api.IConnection = { host: connection.host };
  targetConnection.headers = { Authorization: targetAuth.token.access };
  // 3. Create a community for posts
  const community = await generate_random_reddit_clone_communities_create(
    requesterConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 4. Subscribe target member to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      targetConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5. Create multiple test posts by the target member
  const postCount = 3;
  const createdPosts: IRedditClonePost[] = [];
  for (let i = 0; i < postCount; i++) {
    const post = await generate_random_reddit_clone_member_posts_create(
      targetConnection,
      {
        body: {
          title: `Test Post ${i + 1}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
          post_type: "TEXT" as const,
          community_id: community.id,
          text: {
            body: RandomGenerator.content({ paragraphs: 2 }),
          } satisfies IRedditClonePostText.ICreate,
        } satisfies IRedditClonePost.ICreate,
      },
    );
    typia.assert(post);
    createdPosts.push(post);
    // Small delay to ensure different created_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 6. Query the target member's post history using requester connection
  const response = await api.functional.redditClone.member.members.posts.index(
    requesterConnection,
    {
      memberId: targetAuth.id,
      body: {
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(response);
  // 7. Validate pagination structure
  TestValidator.predicate("has pagination", response.pagination !== undefined);
  TestValidator.predicate("has data array", Array.isArray(response.data));
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.equals("records count", response.pagination.records, postCount);
  TestValidator.predicate("pages is positive", response.pagination.pages > 0);
  // 8. Validate all posts are authored by the target member
  TestValidator.equals(
    "post count matches",
    response.data.length,
    createdPosts.length,
  );
  for (const post of response.data) {
    // Validate post structure
    TestValidator.equals(
      "author is target member",
      post.author.id,
      targetAuth.id,
    );
    TestValidator.predicate("has valid id", post.id !== undefined);
    TestValidator.predicate("has title", post.title.length > 0);
    TestValidator.predicate("has post_type", post.post_type !== undefined);
    TestValidator.predicate("has community", post.community !== undefined);
    TestValidator.predicate(
      "vote_score is integer",
      Number.isInteger(post.vote_score),
    );
    TestValidator.predicate(
      "comment_count is integer",
      Number.isInteger(post.comment_count),
    );
    TestValidator.predicate("has created_at", post.created_at !== undefined);
    TestValidator.predicate("has preview", post.preview !== undefined);
    // Validate community matches
    TestValidator.equals("community matches", post.community.id, community.id);
  }
  // 9. Verify posts are sorted by created_at in descending order (newest first)
  for (let i = 0; i < response.data.length - 1; i++) {
    const currentTime = new Date(response.data[i].created_at).getTime();
    const nextTime = new Date(response.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `posts sorted DESC at index ${i}`,
      currentTime >= nextTime,
    );
  }
  // 10. Verify all created posts are in the response
  const responsePostIds = response.data.map((p) => p.id);
  for (const createdPost of createdPosts) {
    TestValidator.predicate(
      `created post ${createdPost.id} in response`,
      responsePostIds.includes(createdPost.id),
    );
  }
}
