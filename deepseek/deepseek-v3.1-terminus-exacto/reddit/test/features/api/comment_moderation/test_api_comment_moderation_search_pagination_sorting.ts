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

export async function test_api_comment_moderation_search_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. Create test users, communities, posts, and comments
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      username: RandomGenerator.alphaNumeric(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
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
  // 3. Create 15+ moderation actions with varied timestamps and action types
  const actionTypes = ["delete", "approve", "ban_user", "remove_ban"] as const;
  const moderationActions: ICommunityPlatformCommentModeration[] = [];
  for (let i = 0; i < 15; i++) {
    const actionType = RandomGenerator.pick(actionTypes);
    const moderation =
      await generate_random_community_platform_admin_posts_comments_moderations_create(
        adminConnection,
        {
          params: { postId: post.id, commentId: comment.id },
          body: {
            action_type: actionType,
            reason: RandomGenerator.paragraph({ sentences: 1 }),
            status: "active",
            duration_hours: actionType === "ban_user" ? 24 : null,
          } satisfies ICommunityPlatformCommentModeration.ICreate,
        },
      );
    typia.assert(moderation);
    moderationActions.push(moderation);
  }
  // 4. Test pagination with limit=5 and page=1
  const page1Response =
    await api.functional.communityPlatform.admin.posts.comments.moderations.index(
      adminConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommentModeration.IRequest,
      },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 should have 5 items",
    page1Response.data.length,
    5,
  );
  TestValidator.equals(
    "total records should be 15",
    page1Response.pagination.records,
    15,
  );
  TestValidator.equals(
    "total pages should be 3",
    page1Response.pagination.pages,
    3,
  );
  TestValidator.equals(
    "current page should be 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 5", page1Response.pagination.limit, 5);
  // 5. Test pagination with page=2
  const page2Response =
    await api.functional.communityPlatform.admin.posts.comments.moderations.index(
      adminConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformCommentModeration.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 should have 5 items",
    page2Response.data.length,
    5,
  );
  TestValidator.equals(
    "current page should be 2",
    page2Response.pagination.current,
    2,
  );
  // 6. Test pagination with page=3
  const page3Response =
    await api.functional.communityPlatform.admin.posts.comments.moderations.index(
      adminConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          page: 3,
          limit: 5,
        } satisfies ICommunityPlatformCommentModeration.IRequest,
      },
    );
  typia.assert(page3Response);
  TestValidator.equals(
    "page 3 should have 5 items",
    page3Response.data.length,
    5,
  );
  TestValidator.equals(
    "current page should be 3",
    page3Response.pagination.current,
    3,
  );
  // 7. Test default sorting (created_at descending)
  const allModerations =
    await api.functional.communityPlatform.admin.posts.comments.moderations.index(
      adminConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          limit: 15,
        } satisfies ICommunityPlatformCommentModeration.IRequest,
      },
    );
  typia.assert(allModerations);
  // Verify descending order by checking created_at timestamps
  for (let i = 1; i < allModerations.data.length; i++) {
    const current = new Date(allModerations.data[i].created_at).getTime();
    const previous = new Date(allModerations.data[i - 1].created_at).getTime();
    TestValidator.predicate(
      "items should be in descending order",
      current <= previous,
    );
  }
  // 8. Test explicit sorting with sort='created_at' and sort_direction='asc'
  const ascendingResponse =
    await api.functional.communityPlatform.admin.posts.comments.moderations.index(
      adminConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          sort: "created_at",
          sort_direction: "asc",
          limit: 15,
        } satisfies ICommunityPlatformCommentModeration.IRequest,
      },
    );
  typia.assert(ascendingResponse);
  // Verify ascending order
  for (let i = 1; i < ascendingResponse.data.length; i++) {
    const current = new Date(ascendingResponse.data[i].created_at).getTime();
    const previous = new Date(
      ascendingResponse.data[i - 1].created_at,
    ).getTime();
    TestValidator.predicate(
      "items should be in ascending order",
      current >= previous,
    );
  }
  // 9. Test sorting by action_type
  const actionTypeResponse =
    await api.functional.communityPlatform.admin.posts.comments.moderations.index(
      adminConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          sort: "action_type",
          sort_direction: "asc",
          limit: 15,
        } satisfies ICommunityPlatformCommentModeration.IRequest,
      },
    );
  typia.assert(actionTypeResponse);
  // Verify action_type sorting (alphabetical order)
  for (let i = 1; i < actionTypeResponse.data.length; i++) {
    const current = actionTypeResponse.data[i].action_type;
    const previous = actionTypeResponse.data[i - 1].action_type;
    TestValidator.predicate(
      "action_type should be in alphabetical order",
      current >= previous,
    );
  }
  // 10. Test pagination edge cases
  // Page beyond total pages
  const beyondPageResponse =
    await api.functional.communityPlatform.admin.posts.comments.moderations.index(
      adminConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          page: 10,
          limit: 5,
        } satisfies ICommunityPlatformCommentModeration.IRequest,
      },
    );
  typia.assert(beyondPageResponse);
  TestValidator.equals(
    "page beyond total should be empty",
    beyondPageResponse.data.length,
    0,
  );
  // Limit larger than total records
  const largeLimitResponse =
    await api.functional.communityPlatform.admin.posts.comments.moderations.index(
      adminConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformCommentModeration.IRequest,
      },
    );
  typia.assert(largeLimitResponse);
  TestValidator.equals(
    "large limit should return all items",
    largeLimitResponse.data.length,
    15,
  );
  TestValidator.equals(
    "current page should be 1",
    largeLimitResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "total pages should be 1",
    largeLimitResponse.pagination.pages,
    1,
  );
  // 11. Test filtering combined with pagination
  const deleteActionsResponse =
    await api.functional.communityPlatform.admin.posts.comments.moderations.index(
      adminConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          action_type: "delete",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommentModeration.IRequest,
      },
    );
  typia.assert(deleteActionsResponse);
  // Verify all returned actions are of type 'delete'
  for (const action of deleteActionsResponse.data) {
    TestValidator.equals(
      "filtered actions should be delete type",
      action.action_type,
      "delete",
    );
  }
}
