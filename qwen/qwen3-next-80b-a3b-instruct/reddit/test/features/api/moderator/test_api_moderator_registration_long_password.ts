import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_registration_long_password(
  connection: api.IConnection,
) {
  // Generate a password that exceeds the maximum allowed length of 128 characters
  const longPassword = RandomGenerator.alphaNumeric(129); // 129 characters exceeds 128 limit

  // Verify that the system rejects registration with password exceeding maximum length
  // This tests input length constraints preventing potential buffer overflow or excessive memory allocation issues
  await TestValidator.error(
    "registration should reject password longer than 128 characters",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: longPassword,
      });
    },
  );
}
