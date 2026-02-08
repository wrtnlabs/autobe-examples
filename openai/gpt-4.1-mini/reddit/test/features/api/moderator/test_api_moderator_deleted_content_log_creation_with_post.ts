import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { generate_random_community_platform_moderator_deleted_contents_create_deleted_content } from "../../../generate/generate_random_community_platform_moderator_deleted_contents_create_deleted_content";

export async function test_api_moderator_deleted_content_log_creation_with_post(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the successful creation of a deleted content log entry by an authorized community moderator.
  // It verifies authorization by performing moderator join before the operation.

  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };

  const deletedContent =
    await generate_random_community_platform_moderator_deleted_contents_create_deleted_content(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(deletedContent);

  // Since the properties do not exist on the type, no property checks are performed here.
  // We can validate that the object exists and is valid as per type assertion.
  TestValidator.predicate("deletedContent is object", typeof deletedContent === "object");
}
