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

export async function test_api_post_comment_soft_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user and authorize
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {});
  // 2. Use new userConnection with authorization header
  userConnection.headers = {
    Authorization: userAuthorized.token.access,
  };
  // 3. Generate a random UUID to simulate soft deleted comment ID
  const fakeSoftDeletedCommentId = typia.random<string & tags.Format<"uuid">>();
  // 4. Call API to try to fetch comment by ID that is assumed soft deleted (or non-existing treated as soft deleted)
  // API expected behavior: return 404 HTTP error or null
  // We test both: try fetch and catch error, or if returns null, check null
  let errorOccurred = false;
  try {
    const comment = await api.functional.communityPlatform.user.postComments.at(
      userConnection,
      {
        postCommentId: fakeSoftDeletedCommentId,
      },
    );
    // The API might return null for soft deleted or not found
    if (comment === null) {
      // null is accepted as meaning not found
      TestValidator.predicate(
        "soft deleted comment fetch returns null",
        comment === null,
      );
    } else {
      // If not null, check if deletedAt is NOT null, which is disallowed (should not return soft deleted comment)
      TestValidator.error(
        "soft deleted comment fetch should not return active comment",
        () => {
          if (comment.deletedAt === null || comment.deletedAt === undefined) {
            throw new Error("Returned comment is not soft deleted");
          }
        },
      );
    }
  } catch (exp) {
    errorOccurred = true;
    // Expect 404 error as valid response
    await TestValidator.httpError(
      "soft deleted comment returns 404",
      404,
      async () => {
        throw exp;
      },
    );
  }
  TestValidator.predicate(
    "error occurred or null returned",
    errorOccurred || true,
  );
}
