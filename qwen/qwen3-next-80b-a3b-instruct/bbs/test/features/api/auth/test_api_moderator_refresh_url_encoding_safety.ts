import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_url_encoding_safety(
  connection: api.IConnection,
) {
  // Test with %20 (space) encoded in refresh token
  await TestValidator.error(
    "refresh token with %20 (space) should be rejected",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: "refresh_84b7a1b8-481e-4009-ba7f-4d6531b89b2f%20",
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );

  // Test with %00 (null) encoded in refresh token
  await TestValidator.error(
    "refresh token with %00 (null) should be rejected",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: "refresh_84b7a1b8-481e-4009-ba7f-4d6531b89b2f%00",
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );
}
