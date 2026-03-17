import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_owner_comment_sorted_best_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated connections for owner and member
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {});
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Member creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Member subscribes to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // Member creates a text post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // Create multiple comments with varying content
  const comments = await ArrayUtil.asyncRepeat(5, async () => {
    return generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  });
  comments.forEach((comment) => typia.assert(comment));
  // Owner retrieves comments sorted by BEST
  const result =
    await api.functional.redditLike.owner.posts.comments.sorted.index(
      ownerConnection,
      {
        postId: post.id,
        body: {
          sort: "BEST",
          page: 1,
          limit: 20,
          search: null,
          authorId: null,
          parentId: null,
          includeDeleted: false,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records >= 5",
    result.pagination.records >= 5,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    result.pagination.pages >= 1,
  );
  // Validate data array
  TestValidator.predicate("data is array", Array.isArray(result.data));
  TestValidator.predicate("data length > 0", result.data.length > 0);
  TestValidator.predicate(
    "data length matches records limit",
    result.data.length <= result.pagination.limit,
  );
  // Validate each comment has required fields and valid structure
  for (const comment of result.data) {
    typia.assert(comment);
    TestValidator.predicate("comment has content", comment.content.length > 0);
    TestValidator.predicate(
      "comment has author",
      comment.author !== null && typeof comment.author === "object",
    );
    TestValidator.predicate(
      "comment has vote_score",
      typeof comment.vote_score === "number",
    );
    TestValidator.predicate(
      "comment has reply_count",
      typeof comment.reply_count === "number",
    );
    TestValidator.predicate(
      "comment has created_at",
      typeof comment.created_at === "string",
    );
  }
  // Validate BEST sorting - higher vote scores should appear before lower ones
  for (let i = 1; i < result.data.length; i++) {
    const prev = result.data[i - 1];
    const curr = result.data[i];
    TestValidator.predicate(
      `BEST sort: comment[${i}].vote_score <= comment[${i - 1}].vote_score`,
      curr.vote_score <= prev.vote_score,
    );
  }
}