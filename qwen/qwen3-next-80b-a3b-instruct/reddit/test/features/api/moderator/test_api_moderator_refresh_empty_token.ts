import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_refresh_empty_token(
  connection: api.IConnection,
) {
  // Test that refreshing with an empty refresh token triggers a 400 Bad Request error
  await TestValidator.error(
    "empty refresh token should return 400 Bad Request",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: "", // Empty string refresh token - valid type but invalid value
      });
    },
  );
}
