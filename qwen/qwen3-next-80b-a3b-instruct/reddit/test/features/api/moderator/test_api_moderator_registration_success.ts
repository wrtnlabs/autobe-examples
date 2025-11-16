import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerator";

export async function test_api_moderator_registration_success(
  connection: api.IConnection,
) {
  // Generate valid moderator registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  // Convert the moderator credentials to a JSON string as required by IModerator.ICreate
  const requestBody = JSON.stringify({ email, password });

  // Call the moderator join API with valid credentials
  const response = await api.functional.auth.moderator.join(connection, {
    body: requestBody satisfies IModerator.ICreate,
  });

  // Verify the response contains the expected structure and types
  typia.assert(response);
}
