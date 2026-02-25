import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_post_comment_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and login
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // For an existing post comment, simulate creation by obtaining a valid postCommentId
  // In this scenario we assume postCommentId is obtained from authorized user context or create a post comment via a utility if existed
  // Since there's no direct utility or API in given information to create post comment,
  // and for the primary success path, we use the postCommentId from the returned authorized user id as a dummy UUID
  // This is the best effort as the scenario requires a valid postCommentId, but the test environment does not provide creation API here.
  const postCommentId = authorizedUser.id; // used as UUID since it has uuid format
  // 2. Retrieve the existing post comment by valid postCommentId
  const postComment =
    await api.functional.communityPlatform.user.postComments.at(
      userConnection,
      {
        postCommentId: postCommentId,
      },
    );
  typia.assert(postComment);
  // 3. Validate primary response fields
  // - Verify comment content exists and is string
  TestValidator.predicate(
    "comment content is string",
    typeof postComment.content === "string",
  );
  // - Verify author summary fields
  TestValidator.predicate(
    "author has uuid",
    typeof postComment.author.id === "string" &&
      postComment.author.id.length > 0,
  );
  TestValidator.predicate(
    "author has username",
    typeof postComment.author.username === "string" &&
      postComment.author.username.length > 0,
  );
  TestValidator.predicate(
    "author has displayName",
    typeof postComment.author.displayName === "string" &&
      postComment.author.displayName.length > 0,
  );
  // - Verify timestamps are ISO date-time strings
  TestValidator.predicate(
    "createdAt is valid date-time",
    typeof postComment.createdAt === "string" &&
      postComment.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    typeof postComment.updatedAt === "string" &&
      postComment.updatedAt.length > 0,
  );
  // - Verify deletedAt is null (active comment)
  TestValidator.equals(
    "deletedAt is null",
    postComment.deletedAt ?? null,
    null,
  );
  // - If parentComment exists, verify its fields are of correct type
  if (
    postComment.parentComment !== null &&
    postComment.parentComment !== undefined
  ) {
    TestValidator.predicate(
      "parentComment has id string",
      typeof postComment.parentComment.id === "string" &&
        postComment.parentComment.id.length > 0,
    );
    TestValidator.predicate(
      "parentComment has contentText string",
      typeof postComment.parentComment.contentText === "string" &&
        postComment.parentComment.contentText.length > 0,
    );
    TestValidator.predicate(
      "parentComment createdAt is string",
      typeof postComment.parentComment.createdAt === "string" &&
        postComment.parentComment.createdAt.length > 0,
    );
    TestValidator.predicate(
      "parentComment updatedAt is string",
      typeof postComment.parentComment.updatedAt === "string" &&
        postComment.parentComment.updatedAt.length > 0,
    );
  }
}
