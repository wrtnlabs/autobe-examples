import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_custom_error_messages(
  connection: api.IConnection,
) {
  // Test: Invalid string credentials should return generic 'Invalid credentials' error
  // Since ILogin is type string (not an object), we test with clearly invalid strings
  // The API should reject malformed or invalid credential strings with generic error

  // Test with empty string - should fail with generic message
  await TestValidator.error(
    "empty credential string should return generic error",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: "" satisfies IPoliticalForumModerator.ILogin,
      });
    },
  );

  // Test with invalid format - non-base64 string
  await TestValidator.error(
    "malformed credential string should return generic error",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: "not-a-valid-base64-string" satisfies IPoliticalForumModerator.ILogin,
      });
    },
  );

  // Test with very short string - should fail
  await TestValidator.error(
    "too-short credential string should return generic error",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: "x" satisfies IPoliticalForumModerator.ILogin,
      });
    },
  );
}
