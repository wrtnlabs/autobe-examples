import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_registration_short_password(
  connection: api.IConnection,
) {
  // Test moderator registration with password shorter than minimum length (8 characters)
  // The system should reject passwords shorter than 8 characters
  // This validates password complexity enforcement for security

  // Use a password that is exactly 7 characters long to trigger validation failure
  const shortPassword = "Pass123"; // 7 characters - below minimum required
  const email = typia.random<string & tags.Format<"email">>();

  // The ICommunityBBSModerator.ICreate type is defined as string, representing a JSON payload
  // We must construct the exact JSON string that satisfies the API contract
  const requestBody = JSON.stringify({
    email: email,
    password: shortPassword,
    ip: "192.168.1.1",
    href: "https://example.com/join",
    referrer: "https://example.com/",
  });

  // Validate that API rejects registration with short password
  await TestValidator.error(
    "registration should fail with password shorter than 8 characters",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: requestBody,
      });
    },
  );
}
