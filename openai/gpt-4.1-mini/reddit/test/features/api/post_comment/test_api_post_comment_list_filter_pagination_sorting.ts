import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_post_comments_create } from "../../../generate/generate_random_community_platform_user_post_comments_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post_comment } from "../../../prepare/prepare_random_community_platform_post_comment";

export async function test_api_post_comment_list_filter_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve paginated comments for a specific post, excluding deleted comments
  // Scenario 2: Retrieve comments filtered by userId and text search, sorted by createdAt descending
  // Scenario 3: Retrieve child comments for a parent comment, sorted ascending by createdAt, excluding deleted
  // 1. User signup and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a community for the post
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community
  const postCreateBody: ICommunityPlatformPost.ICreate = {
    title: RandomGenerator.name(3),
    postType: "text",
  } as any;
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  // 4. Create multiple comments, including parent and child comments
  const parentComment =
    await generate_random_community_platform_user_post_comments_create(
      userConnection,
      {
        body: {
          post_id: post.id,
          content_text: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: null,
        },
      },
    );
  typia.assert(parentComment);
  const childComment1 =
    await generate_random_community_platform_user_post_comments_create(
      userConnection,
      {
        body: {
          post_id: post.id,
          content_text: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: parentComment.id,
        },
      },
    );
  typia.assert(childComment1);
  const childComment2 =
    await generate_random_community_platform_user_post_comments_create(
      userConnection,
      {
        body: {
          post_id: post.id,
          content_text: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: parentComment.id,
        },
      },
    );
  typia.assert(childComment2);
  // 5. Create some comments by another user for cross-user test
  const anotherUserConnection: api.IConnection = { host: connection.host };
  const anotherAuthorized = await authorize_user_join(
    anotherUserConnection,
    {},
  );
  anotherUserConnection.headers = {
    Authorization: anotherAuthorized.token.access,
  };
  const uniqueSearchText = "unique_search_term_xyz";
  const anotherUserComment =
    await generate_random_community_platform_user_post_comments_create(
      anotherUserConnection,
      {
        body: {
          post_id: post.id,
          content_text: uniqueSearchText,
          parent_comment_id: null,
        },
      },
    );
  typia.assert(anotherUserComment);
  // 6. Scenario 1: Retrieve a paginated list of comments for a specific post
  const page1 = 1;
  const limit1 = 2;
  const resultByPost =
    await api.functional.communityPlatform.user.postComments.index(
      userConnection,
      {
        body: {
          postId: post.id,
          page: page1,
          limit: limit1,
          sort: "createdAtAsc",
        },
      },
    );
  typia.assert(resultByPost);
  // Validate all comments correspond to the post and are not deleted
  TestValidator.predicate(
    "scenario 1: all comments belong to the post and not deleted",
    resultByPost.data.every(
      (comment) =>
        comment.post.id === post.id &&
        (comment.deletedAt === null || comment.deletedAt === undefined),
    ),
  );
  // Validate pagination metadata
  TestValidator.equals(
    "scenario 1: current page",
    resultByPost.pagination.current,
    page1,
  );
  TestValidator.equals(
    "scenario 1: limit",
    resultByPost.pagination.limit,
    limit1,
  );
  TestValidator.predicate(
    "scenario 1: total records non-negative",
    resultByPost.pagination.records >= 0,
  );
  TestValidator.predicate(
    "scenario 1: pages non-negative",
    resultByPost.pagination.pages >= 0,
  );
  // 7. Scenario 2: Retrieve comments filtered by userId and text search, sorted by createdAt descending
  const resultByUserAndSearch =
    await api.functional.communityPlatform.user.postComments.index(
      userConnection,
      {
        body: {
          userId: anotherAuthorized.id,
          search: uniqueSearchText,
          page: 1,
          limit: 5,
          sort: "createdAtDesc",
        },
      },
    );
  typia.assert(resultByUserAndSearch);
  // Validate all returned comments have the specified author and content includes search text
  TestValidator.predicate(
    "scenario 2: all comments authored by user",
    resultByUserAndSearch.data.every(
      (comment) => comment.author.id === anotherAuthorized.id,
    ),
  );
  TestValidator.predicate(
    "scenario 2: all comments contain the search text",
    resultByUserAndSearch.data.every((comment) =>
      comment.contentText.includes(uniqueSearchText),
    ),
  );
  // 8. Scenario 3: Retrieve child comments for a parent comment, sorted by createdAt ascending
  const resultByParentComment =
    await api.functional.communityPlatform.user.postComments.index(
      userConnection,
      {
        body: {
          parentCommentId: parentComment.id,
          page: 1,
          limit: 10,
          sort: "createdAtAsc",
        },
      },
    );
  typia.assert(resultByParentComment);
  // Validate that all comments are direct children of the parent comment
  TestValidator.predicate(
    "scenario 3: all comments are direct replies to the parent comment",
    resultByParentComment.data.every(
      (comment) =>
        comment.parentComment !== null &&
        comment.parentComment !== undefined &&
        comment.parentComment.id === parentComment.id,
    ),
  );
  // Validate that deleted comments are excluded
  TestValidator.predicate(
    "scenario 3: exclude deleted comments",
    resultByParentComment.data.every(
      (comment) =>
        comment.deletedAt === null || comment.deletedAt === undefined,
    ),
  );
  // Validate sorting order ascending by createdAt
  for (let i = 1; i < resultByParentComment.data.length; ++i) {
    TestValidator.predicate(
      `scenario 3: createdAt order ascending for items ${i - 1} and ${i}`,
      new Date(resultByParentComment.data[i - 1].createdAt) <=
        new Date(resultByParentComment.data[i].createdAt),
    );
  }
}
