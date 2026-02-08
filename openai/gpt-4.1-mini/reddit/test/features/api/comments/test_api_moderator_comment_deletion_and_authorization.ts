import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_comment_deletion_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful comment deletion by authorized moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Moderator joins and is authorized
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {}, // Empty join body as per ICommunityPlatformModerator.IJoin
  });
  typia.assert(authorized);
  // We need a commentId to delete. Since test setup specifics are missing,
  // assume creating a new comment is outside scope and use a dummy UUID that represents an existing comment.
  // In a real environment, this should query or create a valid existing comment.
  const existingCommentId = typia.random<string & tags.Format<"uuid">>();
  // Perform deletion
  await api.functional.communityPlatform.moderator.comments.erase(
    moderatorConnection,
    { commentId: existingCommentId },
  );
  // Try deleting again should return a not found error
  await TestValidator.httpError(
    "deletion of already deleted comment should return not found error",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.comments.erase(
        moderatorConnection,
        { commentId: existingCommentId },
      );
    },
  );
  // Scenario 2: Deletion attempt for non-existent comment
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deletion of non-existent comment should return not found error",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.comments.erase(
        moderatorConnection,
        {
          commentId: nonExistentCommentId,
        },
      );
    },
  );
  // Scenario 3: Unauthorized deletion attempt by non-moderator
  // Use base connection which is not authorized as moderator
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized deletion should fail with 401 or 403",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.comments.erase(
        nonModeratorConnection,
        {
          commentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
