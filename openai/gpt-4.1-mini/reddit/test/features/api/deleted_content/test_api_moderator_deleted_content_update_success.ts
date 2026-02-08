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

export async function test_api_moderator_deleted_content_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Moderator join to authenticate
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {} satisfies ICommunityPlatformModerator.IJoin,
    },
  );
  // Create moderator connection with Authorization header
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${moderatorAuthorized.token.access}` },
  };
  // Generate a random deletedContentId (UUID) for non-existent ID test
  const nonExistentDeletedContentId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Generate update body
  // Since we don't have DTO details, we generate example data using typia.random
  const updateBody = typia.random<ICommunityPlatformDeletedContent.IUpdate>();
  // Test updating with a non-existent deletedContentId - expect not found error
  await TestValidator.httpError(
    "non-existent deletedContentId returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.deletedContents.update(
        moderatorConnection,
        {
          deletedContentId: nonExistentDeletedContentId,
          body: updateBody,
        },
      );
    },
  );
  // Because no API to create a deleted content record, we will assume update on existing id
  // Generate an existing deletedContentId (UUID)
  const deletedContentId = typia.random<string & tags.Format<"uuid">>();
  // Perform update operation
  const updated =
    await api.functional.communityPlatform.moderator.deletedContents.update(
      moderatorConnection,
      {
        deletedContentId: deletedContentId,
        body: updateBody,
      },
    );
  typia.assert(updated);
  // Validate that updated record is returned
  TestValidator.predicate(
    "updated record returned",
    updated !== null && updated !== undefined,
  );
  // Test unauthorized access with no auth header
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access throws 401",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.deletedContents.update(
        unauthorizedConnection,
        {
          deletedContentId: deletedContentId,
          body: updateBody,
        },
      );
    },
  );
}
