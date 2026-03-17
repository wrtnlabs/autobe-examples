import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test handling when attempting to update a non-existent moderator.
 * Verify that updating a moderator with a non-existent UUID returns 404 Not Found.
 */
export async function test_api_moderator_permission_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a moderator to establish caller identity
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, { body: {} });
  // 2. Generate a random UUID that doesn't exist in the database
  const nonExistentModeratorId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to update the non-existent moderator
  // This should return HTTP 404 Not Found
  await TestValidator.httpError(
    "should return 404 for non-existent moderator",
    404,
    async () => {
      await api.functional.redditLike.moderator.moderators.update(
        moderatorConnection,
        {
          moderatorId: nonExistentModeratorId,
          body: {
            role: "admin",
          } satisfies IRedditLikeModerator.IUpdate,
        },
      );
    },
  );
}
