import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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

export async function test_api_community_platform_moderator_comment_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieval of a comment by a UUID that does not exist in the database.
  // Authenticate as a moderator by joining, then attempt to retrieve a non-existent comment.
  // 1. Moderator authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {}, // ICommunityPlatformModerator.IJoin is empty object
  });
  moderatorConnection.headers = { Authorization: authorized.token.access };
  // 2. Use random UUID for a comment ID that does not exist
  const fakeCommentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the comment with non-existent UUID
  await TestValidator.httpError(
    "retrieve non-existent comment returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.comments.at(
        moderatorConnection,
        {
          commentId: fakeCommentId,
        },
      );
    },
  );
}
