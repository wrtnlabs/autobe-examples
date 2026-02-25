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

export async function test_api_comment_sorting_best_algorithm_vote_based(
  connection: api.IConnection,
): Promise<void> {
  // Create primary user
  const primaryConnection: api.IConnection = { host: connection.host };
  const primaryUser = await authorize_user_join(primaryConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(primaryUser);
  // Create community
  const community =
    await api.functional.communityPlatform.user.communities.create(
      primaryConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create post
  const post = await api.functional.communityPlatform.user.posts.create(
    primaryConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Test the sorting endpoint with 'best' algorithm
  // Since we cannot create comments or votes through the available API,
  // we test the endpoint structure and response format
  const sortedComments =
    await api.functional.communityPlatform.user.posts.comments.sorted.index(
      primaryConnection,
      {
        postId: post.id,
        body: {
          sort: "best" as const,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(sortedComments);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    sortedComments.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", sortedComments.pagination.limit, 10);
  TestValidator.predicate(
    "has records",
    sortedComments.pagination.records >= 0,
  );
  TestValidator.predicate("has pages", sortedComments.pagination.pages >= 0);
  // Validate comment structure for any returned comments
  TestValidator.predicate("has data array", Array.isArray(sortedComments.data));
  for (const comment of sortedComments.data) {
    typia.assert(comment);
    TestValidator.predicate(
      "has valid id",
      typeof comment.id === "string" && comment.id.length > 0,
    );
    TestValidator.predicate(
      "has content",
      typeof comment.content === "string" &&
        comment.content.length > 0 &&
        comment.content.length <= 200,
    );
    TestValidator.predicate(
      "has author",
      typeof comment.author === "object" && comment.author !== null,
    );
    TestValidator.predicate(
      "has post",
      typeof comment.post === "object" && comment.post !== null,
    );
    TestValidator.predicate(
      "has vote_score",
      typeof comment.vote_score === "number",
    );
    TestValidator.predicate(
      "has created_at",
      typeof comment.created_at === "string" && comment.created_at.length > 0,
    );
    // Validate author structure
    TestValidator.predicate(
      "author has id",
      typeof comment.author.id === "string" && comment.author.id.length > 0,
    );
    TestValidator.predicate(
      "author has username",
      typeof comment.author.username === "string" &&
        comment.author.username.length > 0,
    );
    TestValidator.predicate(
      "author has display_name",
      comment.author.display_name === null ||
        typeof comment.author.display_name === "string",
    );
    TestValidator.predicate(
      "author has avatar_url",
      comment.author.avatar_url === null ||
        typeof comment.author.avatar_url === "string",
    );
    TestValidator.predicate(
      "author has karma",
      typeof comment.author.karma === "number",
    );
    TestValidator.predicate(
      "author has created_at",
      typeof comment.author.created_at === "string" &&
        comment.author.created_at.length > 0,
    );
    // Validate post structure
    TestValidator.predicate(
      "post has id",
      typeof comment.post.id === "string" && comment.post.id.length > 0,
    );
    TestValidator.predicate(
      "post has title",
      typeof comment.post.title === "string" && comment.post.title.length > 0,
    );
    TestValidator.predicate(
      "post has post_type",
      typeof comment.post.post_type === "string" &&
        comment.post.post_type.length > 0,
    );
    TestValidator.predicate(
      "post has author",
      typeof comment.post.author === "object" && comment.post.author !== null,
    );
    TestValidator.predicate(
      "post has community",
      typeof comment.post.community === "object" &&
        comment.post.community !== null,
    );
    TestValidator.predicate(
      "post has created_at",
      typeof comment.post.created_at === "string" &&
        comment.post.created_at.length > 0,
    );
  }
  // If there are multiple comments, validate they are sorted by vote_score in descending order
  if (sortedComments.data.length > 1) {
    for (let i = 1; i < sortedComments.data.length; i++) {
      const currentScore = sortedComments.data[i].vote_score;
      const previousScore = sortedComments.data[i - 1].vote_score;
      TestValidator.predicate(
        `comment ${i} should have lower or equal score than previous for best sorting`,
        currentScore <= previousScore,
      );
    }
  }
}
