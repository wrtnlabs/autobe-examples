import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentModeration";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentModeration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_moderator_comment_moderations_date_range_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
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
  // Create comment
  const comment =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // Test date range filtering with various scenarios
  const currentDate = new Date().toISOString();
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
  const futureDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days in future
  // Test past date range
  const pastRangeResult =
    await api.functional.communityPlatform.moderator.posts.comments.moderations.index(
      moderatorConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          created_at_from: pastDate,
          created_at_to: currentDate,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentModeration.IRequest,
      },
    );
  typia.assert(pastRangeResult);
  // Test future date range (should return empty)
  const futureRangeResult =
    await api.functional.communityPlatform.moderator.posts.comments.moderations.index(
      moderatorConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          created_at_from: currentDate,
          created_at_to: futureDate,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentModeration.IRequest,
      },
    );
  typia.assert(futureRangeResult);
  // Test single day range
  const singleDayResult =
    await api.functional.communityPlatform.moderator.posts.comments.moderations.index(
      moderatorConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          created_at_from: currentDate,
          created_at_to: currentDate,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentModeration.IRequest,
      },
    );
  typia.assert(singleDayResult);
  // Test with updated_at filters
  const updatedAtResult =
    await api.functional.communityPlatform.moderator.posts.comments.moderations.index(
      moderatorConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          updated_at_from: pastDate,
          updated_at_to: currentDate,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentModeration.IRequest,
      },
    );
  typia.assert(updatedAtResult);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    pastRangeResult.pagination.current >= 0 &&
      pastRangeResult.pagination.limit > 0 &&
      pastRangeResult.pagination.records >= 0 &&
      pastRangeResult.pagination.pages >= 0,
  );
  // Future date range should return empty since no moderations exist in the future
  TestValidator.equals(
    "future date range should return empty",
    futureRangeResult.data.length,
    0,
  );
  // All results should be valid moderation summaries
  for (const moderation of pastRangeResult.data) {
    typia.assert(moderation);
    TestValidator.predicate(
      "moderation should have valid id",
      typeof moderation.id === "string" && moderation.id.length > 0,
    );
    TestValidator.predicate(
      "moderation should have action type",
      typeof moderation.action_type === "string" &&
        moderation.action_type.length > 0,
    );
    TestValidator.predicate(
      "moderation should have reason",
      typeof moderation.reason === "string" && moderation.reason.length > 0,
    );
    TestValidator.predicate(
      "moderation should have status",
      typeof moderation.status === "string" && moderation.status.length > 0,
    );
    TestValidator.predicate(
      "moderation should have valid moderator",
      typeof moderation.moderator.id === "string" &&
        moderation.moderator.id.length > 0,
    );
  }
}
