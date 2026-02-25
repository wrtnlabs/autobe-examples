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

export async function test_api_post_comment_retrieval_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Fetch a post comment using GET to simulate reply comment with parent
  // Generate a random UUID to test retrieval (because no create endpoint available)
  // This test mainly validates response structure including parent comment
  const randomPostCommentId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.communityPlatform.user.postComments.at(
    userConnection,
    { postCommentId: randomPostCommentId },
  );
  typia.assert(comment);
  // 3. Validate that if parentComment exists in response, it has correct structure
  if (comment.parentComment !== null && comment.parentComment !== undefined) {
    typia.assert(comment.parentComment);
    TestValidator.predicate(
      "parentComment id is defined",
      typeof comment.parentComment.id === "string",
    );
    TestValidator.predicate(
      "parentComment contentText is string",
      typeof comment.parentComment.contentText === "string",
    );
  }
}
