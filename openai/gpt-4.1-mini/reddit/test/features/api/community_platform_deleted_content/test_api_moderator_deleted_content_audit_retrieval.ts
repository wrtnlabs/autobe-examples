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

export async function test_api_moderator_deleted_content_audit_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve detailed deleted content audit record by a moderator.
  // Setup moderator and authorized connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, { body: {} });
  // Create a random valid UUID as deletedContentId for testing
  const validDeletedContentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  // Call the endpoint with existing deletedContentId
  const deletedContent =
    await api.functional.communityPlatform.moderator.deletedContents.at(
      moderatorConnection,
      { deletedContentId: validDeletedContentId },
    );
  typia.assert(deletedContent);
  // Validate the response contains expected keys and values
  TestValidator.predicate(
    "deletedContent has properties",
    () => typeof deletedContent === "object" && deletedContent !== null,
  );
  // Scenario 2: Attempt retrieval by unauthorized user - no join
  await TestValidator.httpError(
    "unauthorized access without join",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.deletedContents.at(
        { host: connection.host },
        { deletedContentId: validDeletedContentId },
      );
    },
  );
  // Scenario 3: Retrieve non-existing deleted content record
  await TestValidator.httpError(
    "non-existing deletedContentId returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.deletedContents.at(
        moderatorConnection,
        {
          deletedContentId:
            "00000000-0000-0000-0000-000000000000" satisfies string &
              tags.Format<"uuid">,
        },
      );
    },
  );
}
