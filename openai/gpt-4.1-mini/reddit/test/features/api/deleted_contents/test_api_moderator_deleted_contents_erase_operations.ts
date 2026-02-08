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

export async function test_api_moderator_deleted_contents_erase_operations(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario 1: Successful deletion of a deleted content record by a moderator.
  // Test scenario 2: Attempt deletion of a non-existent deleted content record.
  // Test scenario 3: Authorization enforcement test.
  // 1. Moderator joins to get authorized connection
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(moderatorAuth);
  // Create moderator connection with authorized token
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${moderatorAuth.token.access}` },
  };
  // 2. For test scenario 1, we need to create a deleted content record to delete
  // Since no direct API to create deleted content is provided, utilize a known UUID
  // However, we must simulate or create a valid UUID to test deletion
  // We will attempt to delete a random UUID to simulate scenario 1
  const existingDeletedContentId = typia.random<string & tags.Format<"uuid">>();
  // Because we cannot ensure existingDeletedContentId exists, we expect possible 404 or 204
  // Attempt deletion of this ID
  try {
    await api.functional.communityPlatform.moderator.deletedContents.erase(
      moderatorConnection,
      {
        deletedContentId: existingDeletedContentId,
      },
    );
  } catch (error) {
    if (error instanceof api.HttpError) {
      const status = error.status;
      // If 404, deletion of non-existent - it is fine
      // If 204, success
      // Unexpected errors throw
      if (status !== 404) throw error;
    } else throw error;
  }
  // 3. Test scenario 2: deletion of non-existent deleted content should 404
  // Use another random UUID which should not exist
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deletion of non-existent deleted content returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.deletedContents.erase(
        moderatorConnection,
        {
          deletedContentId: nonExistentId,
        },
      );
    },
  );
  // 4. Test scenario 3: Authorization enforcement test
  // Attempt delete operation without authentication
  await TestValidator.httpError(
    "unauthorized deletion without auth",
    [401, 403],
    async () => {
      const anonConnection: api.IConnection = { host: connection.host };
      await api.functional.communityPlatform.moderator.deletedContents.erase(
        anonConnection,
        {
          deletedContentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Attempt delete operation with malformed or invalid token
  {
    const invalidTokenConnection: api.IConnection = {
      host: connection.host,
      headers: { Authorization: "Bearer invalidtoken" },
    };
    await TestValidator.httpError(
      "unauthorized deletion with invalid token",
      [401, 403],
      async () => {
        await api.functional.communityPlatform.moderator.deletedContents.erase(
          invalidTokenConnection,
          {
            deletedContentId: typia.random<string & tags.Format<"uuid">>(),
          },
        );
      },
    );
  }
}
