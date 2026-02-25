import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_sorting_new_algorithm_success(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Test comment sorting with 'new' algorithm
  // Note: Comment creation endpoint is not available in provided SDK functions
  // We test the sorting endpoint structure and pagination with existing data
  const sortedComments =
    await api.functional.communityPlatform.user.posts.comments.sorted.index(
      userConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(sortedComments);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    sortedComments.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", sortedComments.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    sortedComments.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    sortedComments.pagination.pages >= 0,
  );
  // Validate comment summary structure for each returned comment
  sortedComments.data.forEach((comment, index) => {
    TestValidator.predicate(`comment ${index} has id`, comment.id.length > 0);
    TestValidator.predicate(
      `comment ${index} has content`,
      comment.content.length > 0 && comment.content.length <= 200,
    );
    TestValidator.predicate(
      `comment ${index} has author`,
      comment.author.id.length > 0,
    );
    TestValidator.predicate(
      `comment ${index} has post`,
      comment.post.id.length > 0,
    );
    TestValidator.predicate(
      `comment ${index} has vote_score`,
      typeof comment.vote_score === "number",
    );
    TestValidator.predicate(
      `comment ${index} has created_at`,
      comment.created_at.length > 0,
    );
    TestValidator.predicate(
      `comment ${index} has updated_at`,
      comment.updated_at === null || comment.updated_at.length > 0,
    );
  });
  // Test pagination with smaller limit
  const paginatedComments =
    await api.functional.communityPlatform.user.posts.comments.sorted.index(
      userConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
          page: 1,
          limit: 3,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(paginatedComments);
  // Validate pagination with smaller limit
  TestValidator.equals(
    "small limit pagination current page",
    paginatedComments.pagination.current,
    1,
  );
  TestValidator.equals(
    "small limit pagination limit",
    paginatedComments.pagination.limit,
    3,
  );
  TestValidator.predicate(
    "small limit data length <= limit",
    paginatedComments.data.length <= 3,
  );
  // If comments exist, validate they are sorted by created_at in descending order
  if (paginatedComments.data.length > 1) {
    for (let i = 0; i < paginatedComments.data.length - 1; i++) {
      const currentComment = paginatedComments.data[i];
      const nextComment = paginatedComments.data[i + 1];
      const currentTime = new Date(currentComment.created_at).getTime();
      const nextTime = new Date(nextComment.created_at).getTime();
      TestValidator.predicate(
        `comment ${i} is newer than comment ${i + 1}`,
        currentTime >= nextTime,
      );
    }
  }
}
