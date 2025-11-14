import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_valid_token_structure(
  connection: api.IConnection,
) {
  // Test that invalid refresh token formats are rejected with 400 Bad Request

  // Invalid format 1: Token with only two parts (missing third section)
  const invalidTokenTwoParts =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0";

  // Invalid format 2: Token with five parts (extra dots)
  const invalidTokenFiveParts =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.x.y.z";

  // Test case 1: Token with two parts (invalid format)
  await TestValidator.error(
    "refresh token with two parts (missing third section) should fail",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: invalidTokenTwoParts,
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );

  // Test case 2: Token with five parts (invalid format)
  await TestValidator.error(
    "refresh token with five parts (extra dots) should fail",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: invalidTokenFiveParts,
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );
}
