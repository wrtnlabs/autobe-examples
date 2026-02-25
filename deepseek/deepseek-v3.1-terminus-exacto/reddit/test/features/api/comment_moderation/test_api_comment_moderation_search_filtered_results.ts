import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_posts_comments_moderations_create } from "../../../generate/generate_random_community_platform_admin_posts_comments_moderations_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_moderation } from "../../../prepare/prepare_random_community_platform_comment_moderation";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_moderation_search_filtered_results(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and register admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create user connection and setup
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
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
  // Create multiple moderation actions with different attributes
  const moderations: ICommunityPlatformCommentModeration[] = [];
  // Create moderation actions with different action types and statuses
  const actionTypes = ["delete", "approve", "ban_user", "remove_ban"] as const;
  const statuses = ["active", "reversed", "expired"] as const;
  for (let i = 0; i < 8; i++) {
    const moderation =
      await generate_random_community_platform_admin_posts_comments_moderations_create(
        adminConnection,
        {
          params: { postId: post.id, commentId: comment.id },
          body: {
            action_type: actionTypes[i % 4],
            reason: `Moderation reason ${i} - ${RandomGenerator.paragraph({ sentences: 1 })}`,
            status: statuses[i % 3],
            duration_hours:
              i % 2 === 0
                ? typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>()
                : null,
          } satisfies ICommunityPlatformCommentModeration.ICreate,
        },
      );
    typia.assert(moderation);
    moderations.push(moderation);
    // Add small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // Test 1: Filter by action_type='delete'
  const deleteFilterResponse =
    await api.functional.communityPlatform.admin.posts.comments.moderations.index(
      adminConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          action_type: "delete",
        } satisfies ICommunityPlatformCommentModeration.IRequest,
      },
    );
  typia.assert(deleteFilterResponse);
  TestValidator.equals(
    "delete filter returns only delete actions",
    deleteFilterResponse.data.length,
    moderations.filter((m) => m.action_type === "delete").length,
  );
  TestValidator.predicate(
    "all returned actions are delete type",
    deleteFilterResponse.data.every((m) => m.action_type === "delete"),
  );
  // Test 2: Filter by status='active'
  const statusFilterResponse =
    await api.functional.communityPlatform.admin.posts.comments.moderations.index(
      adminConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          status: "active",
        } satisfies ICommunityPlatformCommentModeration.IRequest,
      },
    );
  typia.assert(statusFilterResponse);
  TestValidator.equals(
    "active filter returns only active actions",
    statusFilterResponse.data.length,
    moderations.filter((m) => m.status === "active").length,
  );
  TestValidator.predicate(
    "all returned actions are active status",
    statusFilterResponse.data.every((m) => m.status === "active"),
  );
  // Test 3: Filter by moderator_id
  const specificModeratorId = moderations[0].moderator.id;
  const moderatorFilterResponse =
    await api.functional.communityPlatform.admin.posts.comments.moderations.index(
      adminConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          moderator_id: specificModeratorId,
        } satisfies ICommunityPlatformCommentModeration.IRequest,
      },
    );
  typia.assert(moderatorFilterResponse);
  TestValidator.equals(
    "moderator filter returns actions by specific moderator",
    moderatorFilterResponse.data.length,
    moderations.filter((m) => m.moderator.id === specificModeratorId).length,
  );
  TestValidator.predicate(
    "all returned actions have correct moderator",
    moderatorFilterResponse.data.every(
      (m) => m.moderator.id === specificModeratorId,
    ),
  );
  // Test 4: Filter by date range
  const sortedModerations = [...moderations].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const middleIndex = Math.floor(sortedModerations.length / 2);
  const dateFrom = sortedModerations[middleIndex].created_at;
  const dateTo = sortedModerations[sortedModerations.length - 1].created_at;
  const dateFilterResponse =
    await api.functional.communityPlatform.admin.posts.comments.moderations.index(
      adminConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          created_at_from: dateFrom,
          created_at_to: dateTo,
        } satisfies ICommunityPlatformCommentModeration.IRequest,
      },
    );
  typia.assert(dateFilterResponse);
  const expectedDateRangeCount = moderations.filter(
    (m) =>
      new Date(m.created_at) >= new Date(dateFrom) &&
      new Date(m.created_at) <= new Date(dateTo),
  ).length;
  TestValidator.equals(
    "date range filter returns correct number of actions",
    dateFilterResponse.data.length,
    expectedDateRangeCount,
  );
  // Test 5: Filter by reason text (partial match)
  const reasonKeyword = "Moderation reason 1";
  const reasonFilterResponse =
    await api.functional.communityPlatform.admin.posts.comments.moderations.index(
      adminConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          reason: reasonKeyword,
        } satisfies ICommunityPlatformCommentModeration.IRequest,
      },
    );
  typia.assert(reasonFilterResponse);
  TestValidator.predicate(
    "reason filter returns actions containing keyword",
    reasonFilterResponse.data.every((m) => m.reason.includes(reasonKeyword)),
  );
  // Test 6: Empty filter (retrieve all)
  const allFilterResponse =
    await api.functional.communityPlatform.admin.posts.comments.moderations.index(
      adminConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {} satisfies ICommunityPlatformCommentModeration.IRequest,
      },
    );
  typia.assert(allFilterResponse);
  TestValidator.equals(
    "empty filter returns all actions",
    allFilterResponse.data.length,
    moderations.length,
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    allFilterResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "total records matches moderation count",
    allFilterResponse.pagination.records,
    moderations.length,
  );
  TestValidator.predicate(
    "current page is valid",
    allFilterResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    allFilterResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    allFilterResponse.pagination.pages >= 1,
  );
  // Validate each record structure
  allFilterResponse.data.forEach((moderation, index) => {
    TestValidator.predicate(
      `moderation ${index} has id`,
      moderation.id !== undefined && moderation.id.length > 0,
    );
    TestValidator.predicate(
      `moderation ${index} has action_type`,
      moderation.action_type !== undefined,
    );
    TestValidator.predicate(
      `moderation ${index} has reason`,
      moderation.reason !== undefined,
    );
    TestValidator.predicate(
      `moderation ${index} has status`,
      moderation.status !== undefined,
    );
    TestValidator.predicate(
      `moderation ${index} has created_at`,
      moderation.created_at !== undefined,
    );
    TestValidator.predicate(
      `moderation ${index} has moderator`,
      moderation.moderator !== undefined,
    );
    TestValidator.predicate(
      `moderation ${index} moderator has required fields`,
      moderation.moderator.id !== undefined &&
        moderation.moderator.email !== undefined &&
        moderation.moderator.username !== undefined,
    );
  });
}