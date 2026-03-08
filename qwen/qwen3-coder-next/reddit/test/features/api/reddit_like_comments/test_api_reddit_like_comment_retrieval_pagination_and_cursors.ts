import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_subscription } from "../../../prepare/prepare_random_reddit_like_subscription";

export async function test_api_reddit_like_comment_retrieval_pagination_and_cursors(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "123456",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community and subscribe
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await generate_random_reddit_like_member_subscriptions_create(
      communityConnection,
      {
        body: {
          reddit_like_member_id: member.id,
          reddit_like_community_id:
            "00000000-0000-0000-0000-000000000000" satisfies string &
              tags.Format<"uuid">,
          status: "subscribed" as const,
        } satisfies IRedditLikeSubscription.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create test post
  const postConnection: api.IConnection = { host: connection.host };
  const post = await generate_random_reddit_like_member_posts_create(
    postConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 3 }),
        community_id: community.community.id,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create 25 comments for pagination testing
  const commentConnection: api.IConnection = { host: connection.host };
  const comments = await ArrayUtil.asyncRepeat(25, async (index: number) => {
    const comment =
      await generate_random_reddit_like_member_posts_comments_create(
        commentConnection,
        {
          params: { postId: post.id },
          body: {
            content: `Comment ${index + 1}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
          } satisfies IRedditLikeComment.ICreate,
        },
      );
    typia.assert(comment);
    return comment;
  });
  // 5. Test first page with limit 20
  const firstPage = await api.functional.redditLike.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        limit: 20,
        page: 1,
      } satisfies IRedditLikeComment.IRequest,
    },
  );
  typia.assert(firstPage);
  // Validate first page
  TestValidator.equals("first page has 20 comments", firstPage.data.length, 20);
  TestValidator.predicate(
    "pagination exists",
    firstPage.pagination !== undefined,
  );
  TestValidator.equals("first page limit", firstPage.pagination.limit, 20);
  TestValidator.equals("first page records", firstPage.pagination.records, 25);
  TestValidator.equals("first page pages", firstPage.pagination.pages, 2);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  // 6. Test second page using page parameter
  const secondPage = await api.functional.redditLike.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        page: 2,
        limit: 20,
      } satisfies IRedditLikeComment.IRequest,
    },
  );
  typia.assert(secondPage);
  // Validate second page
  TestValidator.equals("second page has 5 comments", secondPage.data.length, 5);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 20);
  TestValidator.equals(
    "second page records",
    secondPage.pagination.records,
    25,
  );
  TestValidator.equals("second page pages", secondPage.pagination.pages, 2);
}
