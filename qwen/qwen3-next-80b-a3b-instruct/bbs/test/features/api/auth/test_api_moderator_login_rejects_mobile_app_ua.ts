import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_rejects_mobile_app_ua(
  connection: api.IConnection,
) {
  // Test that the system rejects login attempts from known mobile app spoofing user agents
  // Set a known mobile app spoofing user agent in the headers
  const spoofedConnection: api.IConnection = {
    ...connection,
    headers: { "User-Agent": "PostmanRuntime/7.26.8" },
  };

  // Attempt to login with valid credentials using the spoofed user agent
  // This should reject with 403 Forbidden
  await TestValidator.error(
    "Login via automated clients should be rejected with 403 Forbidden",
    async () => {
      await api.functional.auth.moderator.login(spoofedConnection, {
        body: "valid-email@example.com" satisfies IPoliticalForumModerator.ILogin,
      });
    },
  );

  // Also test with another common mobile app spoofing user agent
  const anotherSpoofedConnection: api.IConnection = {
    ...connection,
    headers: { "User-Agent": "python-requests" },
  };

  // Attempt login with the second spoofed user agent
  // This should also be rejected with 403 Forbidden
  await TestValidator.error(
    "Login via python-requests user agent should be rejected with 403 Forbidden",
    async () => {
      await api.functional.auth.moderator.login(anotherSpoofedConnection, {
        body: "another-valid-email@example.com" satisfies IPoliticalForumModerator.ILogin,
      });
    },
  );
}
