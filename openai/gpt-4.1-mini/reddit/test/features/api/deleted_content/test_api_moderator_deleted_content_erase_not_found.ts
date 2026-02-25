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

/**
 * Test the deletion of a deleted content record that does not exist in the system.
 *
 * - Authenticate as a moderator.
 * - Attempt to delete a deleted content with a random UUID that does not exist.
 * - Expect HTTP 404 Not Found error.
 * - Validate no database records are changed (implicitly by no error other than 404).
 */
export async function test_api_moderator_deleted_content_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // 2. Generate a random UUID that does not exist
  const randomNonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete and expect 404 HttpError
  await TestValidator.httpError(
    "deleted content erase not found",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.deleted_contents.eraseDeletedContent(
        moderatorConnection,
        { id: randomNonExistentId },
      );
    },
  );
}
