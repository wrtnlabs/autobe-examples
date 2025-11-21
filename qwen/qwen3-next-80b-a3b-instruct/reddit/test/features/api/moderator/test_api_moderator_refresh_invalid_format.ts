import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_refresh_invalid_format(
  connection: api.IConnection,
) {
  // Generate a well-formed but non-existent JWT refresh token
  // This token has valid Base64 structure but references a moderator ID that does not exist
  // The system should treat this as an invalid session, returning 401 Unauthorized (not 400)
  const fakeRefreshToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

  // Test that API rejects refresh token for non-existent session
  await TestValidator.error(
    "should reject refresh token for non-existent session",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: fakeRefreshToken,
      });
    },
  );
}
