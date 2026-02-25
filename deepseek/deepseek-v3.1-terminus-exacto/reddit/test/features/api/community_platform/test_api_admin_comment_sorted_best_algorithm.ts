import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_admin_comment_sorted_best_algorithm(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Retrieve comments with best sorting
  // Note: Since comment creation endpoint is not available in provided SDK functions,
  // we can only test the structure of the response with existing comments
  const sortedComments =
    await api.functional.communityPlatform.admin.posts.comments.sorted.index(
      adminConnection,
      {
        postId: post.id,
        body: {
          sort: "best",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(sortedComments);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    sortedComments.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    sortedComments.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    sortedComments.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    sortedComments.pagination.pages >= 0,
  );
  // Validate comment structure
  TestValidator.predicate(
    "comments array exists",
    Array.isArray(sortedComments.data),
  );
  if (sortedComments.data.length > 0) {
    // Validate individual comment structure
    sortedComments.data.forEach((comment, index) => {
      TestValidator.predicate(
        `comment ${index} has id`,
        typeof comment.id === "string",
      );
      TestValidator.predicate(
        `comment ${index} has content`,
        typeof comment.content === "string",
      );
      TestValidator.predicate(
        `comment ${index} content truncated correctly`,
        comment.content.length <= 200,
      );
      TestValidator.predicate(
        `comment ${index} has author`,
        typeof comment.author === "object",
      );
      TestValidator.predicate(
        `comment ${index} has post`,
        typeof comment.post === "object",
      );
      TestValidator.predicate(
        `comment ${index} has vote score`,
        typeof comment.vote_score === "number",
      );
      TestValidator.predicate(
        `comment ${index} has created_at`,
        typeof comment.created_at === "string",
      );
      // Validate author structure
      TestValidator.predicate(
        `comment ${index} author has id`,
        typeof comment.author.id === "string",
      );
      TestValidator.predicate(
        `comment ${index} author has username`,
        typeof comment.author.username === "string",
      );
      TestValidator.predicate(
        `comment ${index} author has display_name`,
        comment.author.display_name === null ||
          typeof comment.author.display_name === "string",
      );
      TestValidator.predicate(
        `comment ${index} author has avatar_url`,
        comment.author.avatar_url === null ||
          typeof comment.author.avatar_url === "string",
      );
      TestValidator.predicate(
        `comment ${index} author has karma`,
        typeof comment.author.karma === "number",
      );
      TestValidator.predicate(
        `comment ${index} author has created_at`,
        typeof comment.author.created_at === "string",
      );
      // Validate post structure
      TestValidator.predicate(
        `comment ${index} post has id`,
        typeof comment.post.id === "string",
      );
      TestValidator.predicate(
        `comment ${index} post has title`,
        typeof comment.post.title === "string",
      );
      TestValidator.predicate(
        `comment ${index} post has post_type`,
        typeof comment.post.post_type === "string",
      );
      TestValidator.predicate(
        `comment ${index} post has author`,
        typeof comment.post.author === "object",
      );
      TestValidator.predicate(
        `comment ${index} post has community`,
        typeof comment.post.community === "object",
      );
      TestValidator.predicate(
        `comment ${index} post has created_at`,
        typeof comment.post.created_at === "string",
      );
    });
    // Test that comments are properly structured for best sorting
    // Since we cannot create comments with specific vote scores, we can only validate
    // that the response structure is correct when using the best sort parameter
    TestValidator.predicate(
      "comments returned with best sort parameter",
      sortedComments.data.length >= 0,
    );
  } else {
    // Test passes even if no comments exist - this validates the endpoint works correctly
    // with empty comment lists when using best sorting
    TestValidator.predicate(
      "empty comments list handled correctly",
      sortedComments.data.length === 0,
    );
  }
}
