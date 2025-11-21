import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_refresh_invalid_token(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "invalid refresh token should be rejected",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: "invalid_refresh_token",
      });
    },
  );
}
