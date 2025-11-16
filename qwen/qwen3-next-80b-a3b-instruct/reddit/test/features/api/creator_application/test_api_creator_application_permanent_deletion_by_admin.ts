import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

export async function test_api_creator_application_permanent_deletion_by_admin(
  connection: api.IConnection,
) {
  // Generate a valid UUID for the creator application to be deleted
  const applicationId = typia.random<string & tags.Format<"uuid">>();

  // Perform the permanent deletion of the creator application
  // This is the only available API function from the provided materials
  await api.functional.communityPlatform.admin.creator_applications.erase(
    connection,
    {
      applicationId: applicationId,
    },
  );

  // No response body is returned for DELETE operations, so no typia.assert needed
}
