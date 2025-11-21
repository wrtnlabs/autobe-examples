import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_refresh_missing_token(
  connection: api.IConnection,
) {
  // Test moderator token refresh with no refresh token provided
  // This verifies proper validation of refresh_token field presence
  // Expected outcome: 400 Bad Request error when refresh_token is empty string
  await TestValidator.error("refresh token must be provided", async () => {
    await api.functional.auth.moderator.refresh(connection, {
      body: "",
    });
  });
}
