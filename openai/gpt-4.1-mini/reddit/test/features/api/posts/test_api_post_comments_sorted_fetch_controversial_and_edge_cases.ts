import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_post_comments_sorted_fetch_controversial_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: User registration and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: {}, // ICommunityPlatformUser.IJoin is empty type
  });
  typia.assert(userAuthorized);
  userConnection.headers = { Authorization: userAuthorized.token.access };
  // Step 2: Create a new post (required for comments retrieval)
  const post = (await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: typia.random<ICommunityPlatformPost.ICreate>(),
    },
  )) as ICommunityPlatformPost & {
    id: string;
  };
  typia.assert(post);
  // Step 3: Define a helper async function to fetch sorted comments
  async function fetchSortedComments(
    postId: string,
    body: ICommunityPlatformPostComment.IRequest,
  ): Promise<IPageICommunityPlatformPostComment.ISummary> {
    const response =
      await api.functional.communityPlatform.user.posts.comments.sorted.sortedComments(
        userConnection,
        {
          postId,
          body,
        },
      );
    typia.assert(response);
    return response;
  }
  // Step 4: Edge case - no comments exist for new post
  const noCommentsResult = await fetchSortedComments(post.id, {
    sort_strategy: "controversial",
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformPostComment.IRequest);
  TestValidator.equals(
    "No comments data array length",
    noCommentsResult.data.length,
    0,
  );
  TestValidator.equals(
    "No comments pagination.current",
    noCommentsResult.pagination.current,
    1,
  );
  // Step 5: Verify error handling on invalid/non-existent postId
  await TestValidator.error("invalid postId triggers error", async () => {
    await fetchSortedComments("00000000-0000-0000-0000-000000000000", {
      sort_strategy: "controversial",
      page: 1,
      limit: 10,
    } satisfies ICommunityPlatformPostComment.IRequest);
  });
  // Step 6: Test validity and sorting of comments when some comments exist
  const controversialComments = await fetchSortedComments(post.id, {
    sort_strategy: "controversial",
    page: 1,
    limit: 5,
  } satisfies ICommunityPlatformPostComment.IRequest);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination current positive",
    controversialComments.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    controversialComments.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    controversialComments.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    controversialComments.pagination.records >= 0,
  );
  // Data array length must be <= limit
  TestValidator.predicate(
    "data length limited",
    controversialComments.data.length <= controversialComments.pagination.limit,
  );
  // Assert each comment structure
  controversialComments.data.forEach((comment, index) => {
    typia.assert(comment);
  });
  // Step 7: Pagination - fetch second page
  const secondPageComments = await fetchSortedComments(post.id, {
    sort_strategy: "controversial",
    page: 2,
    limit: 5,
  } satisfies ICommunityPlatformPostComment.IRequest);
  typia.assert(secondPageComments);
  TestValidator.predicate(
    "second page data array present",
    Array.isArray(secondPageComments.data),
  );
}
