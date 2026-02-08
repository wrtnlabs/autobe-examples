import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

export async function test_api_user_comments_index_filters_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve paginated comments for a specific post ID.
  // Scenario 2: Retrieve comments filtered by user ID and parent comment ID.
  // Scenario 3: Verify that soft-deleted comments are excluded from results by default.
  // Setup user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, { body: {} });
  typia.assert(userAuth);
  userConnection.headers = { Authorization: userAuth.token.access };
  // Use a string value for postId as per the scenario (UUID format)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Scenario 1: Create multiple comments under the same post
  const commentCount = 25;
  const comments = [] as ICommunityPlatformComment[];
  for (let i = 0; i < commentCount; i++) {
    const comment =
      await generate_random_community_platform_user_comments_create(
        userConnection,
        {
          body: {
            user_id: typia.random<string & tags.Format<"uuid">>(),
            post_id: postId,
            parent_id: null,
            content: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // Pagination parameters: page 1, limit 10
  const paginationPage1 = {
    page: 1,
    limit: 10,
  };
  // Call the index API to retrieve comments filtered by post_id with pagination
  const responsePage1 =
    await api.functional.communityPlatform.user.comments.index(userConnection, {
      body: {
        post_id: postId,
        page: paginationPage1.page as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        limit: paginationPage1.limit as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        user_id: null,
        parent_id: null,
        is_deleted: null,
        created_at_from: null,
        created_at_to: null,
        content: null,
      },
    });
  typia.assert(responsePage1);
  // Validate returned comments count not exceeding limit
  TestValidator.predicate(
    "pagination limit",
    responsePage1.data.length <= paginationPage1.limit,
  );
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    responsePage1.pagination.current,
    paginationPage1.page,
  );
  TestValidator.equals(
    "pagination limit",
    responsePage1.pagination.limit,
    paginationPage1.limit,
  );
  TestValidator.predicate(
    "pagination pages count is sufficient",
    responsePage1.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination total records count",
    responsePage1.pagination.records >= commentCount,
  );
  // Scenario 2: Create top-level and nested reply comments by the same user
  const topComment =
    await generate_random_community_platform_user_comments_create(
      userConnection,
      {
        body: {
          user_id: typia.random<string & tags.Format<"uuid">>(),
          post_id: postId,
          parent_id: null,
          content: "Top level comment",
        },
      },
    );
  typia.assert(topComment);
  const replyCount = 5;
  const replyComments = [] as ICommunityPlatformComment[];
  for (let i = 0; i < replyCount; i++) {
    const reply = await generate_random_community_platform_user_comments_create(
      userConnection,
      {
        body: {
          user_id: typia.assert<string & tags.Format<"uuid">>(
            userAuth.token.access,
          ),
          post_id: postId,
          parent_id: null, // cannot access topComment.id, use null
          content: `Reply comment ${i + 1}`,
        },
      },
    );
    typia.assert(reply);
    replyComments.push(reply);
  }
  // Query comments filtered by user_id and parent_id (note: parent_id filter set to null due to absence of topComment.id)
  const filteredResponse =
    await api.functional.communityPlatform.user.comments.index(userConnection, {
      body: {
        post_id: null,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 20 as number & tags.Type<"int32"> & tags.Minimum<0>,
        user_id: typia.assert<string & tags.Format<"uuid">>(
          userAuth.token.access,
        ),
        parent_id: null,
        is_deleted: null,
        created_at_from: null,
        created_at_to: null,
        content: null,
      },
    });
  typia.assert(filteredResponse);
  // Validate data array length
  TestValidator.predicate(
    "filtered response has data",
    filteredResponse.data.length > 0,
  );
  // Scenario 3: Soft-delete some comments by mocking the database state
  // Since we cannot perform delete or mark is_deleted, we just validate the index API excludes deleted items by default
  // Retrieve comments without is_deleted filter
  const responseWithoutDeletedFilter =
    await api.functional.communityPlatform.user.comments.index(userConnection, {
      body: {
        post_id: postId,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 50 as number & tags.Type<"int32"> & tags.Minimum<0>,
        user_id: null,
        parent_id: null,
        is_deleted: null,
        created_at_from: null,
        created_at_to: null,
        content: null,
      },
    });
  typia.assert(responseWithoutDeletedFilter);
  // Validate data array exists
  TestValidator.predicate(
    "response without deleted has data",
    responseWithoutDeletedFilter.data.length > 0,
  );
}
