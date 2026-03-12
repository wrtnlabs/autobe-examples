import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test retrieving a user's comment history with pagination and sorting options.
 *
 * Setup: Create a member user, create multiple posts in communities, and create several comments on those posts.
 *
 * Test Steps:
 * 1. Retrieve comment history with default pagination
 * 2. Verify pagination metadata and comment structure
 * 3. Test pagination with custom page and limit
 * 4. Test sorting by score
 * 5. Test filtering by postId
 */
export async function test_api_user_comment_history_retrieve_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      username: RandomGenerator.alphabets(8),
    },
  });
  typia.assert(member);
  // 2. Create multiple posts
  const posts: IRedditClonePost[] = [];
  for (let i = 0; i < 3; i++) {
    const post = await generate_random_reddit_clone_member_posts_create(
      memberConnection,
      {},
    );
    typia.assert(post);
    posts.push(post);
  }
  // 3. Create multiple comments on posts
  const comments: IRedditCloneComment[] = [];
  for (let i = 0; i < 5; i++) {
    const postId = posts[i % posts.length].id;
    const comment =
      await generate_random_reddit_clone_member_posts_comments_create(
        memberConnection,
        {
          params: { postId },
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // 4. Test default pagination (page 1, limit 20)
  const defaultResponse = await api.functional.redditClone.users.comments.index(
    connection,
    {
      username: member.username,
      body: {} satisfies IRedditCloneComment.IRequest,
    },
  );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default pagination current page",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default pagination records count",
    defaultResponse.pagination.records,
    comments.length,
  );
  TestValidator.predicate(
    "default pagination pages calculated correctly",
    defaultResponse.pagination.pages >= 1,
  );
  TestValidator.equals(
    "default response data count",
    defaultResponse.data.length,
    comments.length,
  );
  // 5. Verify comment structure
  for (const comment of defaultResponse.data) {
    TestValidator.predicate(
      "comment has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        comment.id,
      ),
    );
    TestValidator.predicate("comment has content", comment.content.length > 0);
    TestValidator.predicate(
      "comment has score",
      typeof comment.score === "number",
    );
    TestValidator.predicate(
      "comment has created_at",
      comment.created_at.length > 0,
    );
    TestValidator.predicate("comment has author", comment.author !== null);
    TestValidator.predicate("comment has post", comment.post !== null);
  }
  // 6. Test pagination with custom page and limit
  const paginatedResponse =
    await api.functional.redditClone.users.comments.index(connection, {
      username: member.username,
      body: {
        page: 1,
        limit: 2,
      } satisfies IRedditCloneComment.IRequest,
    });
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "custom pagination limit",
    paginatedResponse.pagination.limit,
    2,
  );
  TestValidator.equals(
    "custom pagination current page",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom pagination data count",
    paginatedResponse.data.length,
    2,
  );
  TestValidator.predicate(
    "custom pagination pages calculated",
    paginatedResponse.pagination.pages >= 1,
  );
  // 7. Test sorting by score
  const sortedByScoreResponse =
    await api.functional.redditClone.users.comments.index(connection, {
      username: member.username,
      body: {
        sort: "score",
        order: "desc",
      } satisfies IRedditCloneComment.IRequest,
    });
  typia.assert(sortedByScoreResponse);
  TestValidator.equals(
    "sorted by score response records",
    sortedByScoreResponse.pagination.records,
    comments.length,
  );
  TestValidator.predicate(
    "comments sorted by score descending",
    (() => {
      for (let i = 0; i < sortedByScoreResponse.data.length - 1; i++) {
        if (
          sortedByScoreResponse.data[i].score <
          sortedByScoreResponse.data[i + 1].score
        ) {
          return false;
        }
      }
      return true;
    })(),
  );
  // 8. Test filtering by postId
  const filteredByPostResponse =
    await api.functional.redditClone.users.comments.index(connection, {
      username: member.username,
      body: {
        postId: posts[0].id,
      } satisfies IRedditCloneComment.IRequest,
    });
  typia.assert(filteredByPostResponse);
  TestValidator.predicate(
    "filtered comments belong to specified post",
    (() => {
      for (const comment of filteredByPostResponse.data) {
        if (comment.post.id !== posts[0].id) {
          return false;
        }
      }
      return true;
    })(),
  );
  TestValidator.predicate(
    "filtered response has correct records count",
    filteredByPostResponse.pagination.records <= comments.length,
  );
  // 9. Test sorting by created_at (default)
  const sortedByDateResponse =
    await api.functional.redditClone.users.comments.index(connection, {
      username: member.username,
      body: {
        sort: "created_at",
        order: "desc",
      } satisfies IRedditCloneComment.IRequest,
    });
  typia.assert(sortedByDateResponse);
  TestValidator.predicate(
    "comments sorted by created_at descending",
    (() => {
      for (let i = 0; i < sortedByDateResponse.data.length - 1; i++) {
        const current = new Date(sortedByDateResponse.data[i].created_at);
        const next = new Date(sortedByDateResponse.data[i + 1].created_at);
        if (current < next) {
          return false;
        }
      }
      return true;
    })(),
  );
}
