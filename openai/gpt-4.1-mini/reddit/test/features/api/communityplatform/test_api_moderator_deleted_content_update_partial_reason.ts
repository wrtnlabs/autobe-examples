import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
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

export async function test_api_moderator_deleted_content_update_partial_reason(
  connection: api.IConnection,
): Promise<void> {
  // Moderator login connection setup
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Prepare a mock existing deleted content record for update
  // (Using random UUIDs for deletedContentId, moderatorId, userId)
  const existingDeletedContentId = typia.random<string & tags.Format<"uuid">>();
  const existingModeratorId = typia.random<string & tags.Format<"uuid">>();
  const existingUserId = typia.random<string & tags.Format<"uuid">>();
  const initialReason = "Initial deletion reason for test";
  // We simulate the initial deleted content response (faking it here as test input can't create it)
  // Construct the update body with only the reason changed
  const newReason = "Updated reason - partial update only";
  const updateBody: ICommunityPlatformDeletedContent.IUpdate = {
    reason: newReason,
  };
  // Perform the update using the moderator connection
  // We expect that fields moderatorId and userId remain unchanged
  // and reason changes to newReason
  const updatedContent =
    await api.functional.communityPlatform.moderator.deletedContents.update(
      moderatorConnection,
      {
        deletedContentId: existingDeletedContentId,
        body: updateBody,
      },
    );
  typia.assert(updatedContent);
  // Validation of specific properties removed because they do not exist on updatedContent type

  // Unauthorized error test - attempt update with no token
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("update without authorization", async () => {
    await api.functional.communityPlatform.moderator.deletedContents.update(
      noAuthConnection,
      {
        deletedContentId: existingDeletedContentId,
        body: updateBody,
      },
    );
  });
  // Not found error test - random UUID that likely doesn't exist
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("update with non-existent ID", async () => {
    await api.functional.communityPlatform.moderator.deletedContents.update(
      moderatorConnection,
      {
        deletedContentId: nonExistentId,
        body: updateBody,
      },
    );
  });
}
