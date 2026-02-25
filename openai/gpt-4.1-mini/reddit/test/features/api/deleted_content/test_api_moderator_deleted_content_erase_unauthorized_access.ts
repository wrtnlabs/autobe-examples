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

export async function test_api_moderator_deleted_content_erase_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description:
  // Validate that access is denied if an unauthorized user (non-moderator) tries to permanently delete a deleted content record.
  // - Attempt to call DELETE /communityPlatform/moderator/deleted-contents/{id} without authentication.
  // - Expect HTTP 401 Unauthorized or 403 Forbidden response.
  // - Repeat with a non-moderator authenticated user.
  // - Verify the record remains unchanged in the database.
  //
  // This scenario confirms the enforcement of authorization rules against unauthorized attempts.
  // Create a random UUID for the deleted content ID to test
  const testDeletedContentId = typia.random<string & tags.Format<"uuid">>();
  // 1. Attempt deletion without authentication
  await TestValidator.httpError(
    "unauthorized deletion without authentication",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.deleted_contents.eraseDeletedContent(
        {
          host: connection.host,
        },
        { id: testDeletedContentId },
      );
    },
  );
  // 2. Join as a regular moderator user
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
      },
    },
  );
  // Create a connection with the authorized moderator token
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${moderatorAuthorized.token.access}`,
    },
  };
  // 3. Attempt deletion with authenticated moderator (expected SUCCESS)
  // We do not test here for success since scenario says unauthorized user
  // so we skip with moderator actor.
  // 4. Attempt deletion with a non-moderator authenticated user
  // To simulate a non-moderator user, use a connection with no moderator roles
  // Since no user join or login utility present, simulate with random bearer token
  const nonModeratorConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${typia.random<string>()}`,
    },
  };
  // Expect deletion call to reject due to insufficient privileges
  await TestValidator.httpError(
    "unauthorized deletion with non-moderator authentication",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.deleted_contents.eraseDeletedContent(
        nonModeratorConnection,
        { id: testDeletedContentId },
      );
    },
  );
  // 5. Verify the deleted content record remains unchanged
  // We do not have an API to fetch deleted content, so this validation step
  // cannot be executed here realistically. Scenario requires no mutation on
  // DB, so we trust that error responses preserve DB integrity.
}
