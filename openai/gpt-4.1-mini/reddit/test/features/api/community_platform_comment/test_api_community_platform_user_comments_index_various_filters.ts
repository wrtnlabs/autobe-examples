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

export async function test_api_community_platform_user_comments_index_various_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. User authentication by joining
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  userConnection.headers = userConnection.headers ?? {};
  userConnection.headers.Authorization = user.token.access;
  // 2. Test Scenario 1: Retrieve paginated comment list with no filters
  const noFilterRequest: ICommunityPlatformComment.IRequest = {
    page: 1,
    limit: 10,
  };
  const noFilterResponse =
    await api.functional.communityPlatform.user.comments.index(userConnection, {
      body: noFilterRequest,
    });
  typia.assert(noFilterResponse);
  // Validate pagination object
  TestValidator.predicate(
    "pagination current page >= 1",
    noFilterResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit between 1 and 10",
    noFilterResponse.pagination.limit >= 1 &&
      noFilterResponse.pagination.limit <= 10,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    noFilterResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    noFilterResponse.pagination.pages >= 0,
  );
  // Check comments array
  for (const comment of noFilterResponse.data) {
    typia.assert(comment);
    TestValidator.predicate(
      "comment is not deleted",
      comment.isDeleted === false,
    );
    TestValidator.predicate(
      "comment id exists",
      typeof comment.id === "string" && comment.id.length > 0,
    );
    TestValidator.predicate(
      "comment content exists",
      typeof comment.content === "string" && comment.content.length > 0,
    );
    TestValidator.predicate(
      "comment createdAt exists",
      typeof comment.createdAt === "string",
    );
    TestValidator.predicate(
      "comment updatedAt exists",
      typeof comment.updatedAt === "string",
    );
    // Author check
    const author = comment.author;
    typia.assert(author);
    TestValidator.predicate(
      "author id exists",
      typeof author.id === "string" && author.id.length > 0,
    );
    TestValidator.predicate(
      "author email exists",
      typeof author.email === "string" && author.email.length > 0,
    );
    TestValidator.predicate(
      "author username exists",
      typeof author.username === "string" && author.username.length > 0,
    );
    TestValidator.predicate(
      "author displayName exists",
      typeof author.displayName === "string" && author.displayName.length > 0,
    );
    TestValidator.predicate(
      "author karma is number",
      typeof author.karma === "number",
    );
    TestValidator.predicate(
      "author createdAt exists",
      typeof author.createdAt === "string",
    );
    TestValidator.predicate(
      "author updatedAt exists",
      typeof author.updatedAt === "string",
    );
    // ParentId and children
    TestValidator.predicate(
      "parentId is null or string",
      comment.parentId === null ||
        (typeof comment.parentId === "string" && comment.parentId.length > 0),
    );
    TestValidator.predicate(
      "children is array",
      Array.isArray(comment.children),
    );
  }
  // 3. Test Scenario 2: Retrieve comments filtered by postId and sorted by createdAt
  // As postId is not available directly in comment summary, skip scenario 2 if no valid postId
  // Instead, skip test if postId filter is not available
  // (Further scenario can use userId or parentId filters if required)
  // 4. Test Scenario 3: Retrieve nested replies for a specific parent comment with content search filter
  if (noFilterResponse.data.length > 0) {
    const someParentComment = noFilterResponse.data[0];
    const contentSubstring = someParentComment.content.substring(
      0,
      Math.min(5, someParentComment.content.length),
    );
    const nestedRepliesRequest: ICommunityPlatformComment.IRequest = {
      parentId: someParentComment.id,
      content: contentSubstring,
      page: 1,
      limit: 10,
    };
    const nestedRepliesResponse =
      await api.functional.communityPlatform.user.comments.index(
        userConnection,
        {
          body: nestedRepliesRequest,
        },
      );
    typia.assert(nestedRepliesResponse);
    // Validate all returned comments have the specified parentId
    for (const comment of nestedRepliesResponse.data) {
      TestValidator.equals(
        "comment parentId matches filter",
        comment.parentId,
        someParentComment.id,
      );
      TestValidator.predicate(
        "comment content includes substring",
        comment.content.includes(contentSubstring),
      );
      // Validate nested replies present in children array
      TestValidator.predicate(
        "children is array",
        Array.isArray(comment.children),
      );
    }
    // Validate pagination data
    TestValidator.predicate(
      "pagination current page >= 1",
      nestedRepliesResponse.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit between 1 and 10",
      nestedRepliesResponse.pagination.limit >= 1 &&
        nestedRepliesResponse.pagination.limit <= 10,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      nestedRepliesResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      nestedRepliesResponse.pagination.pages >= 0,
    );
  }
}
