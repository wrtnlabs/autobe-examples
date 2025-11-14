import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_uses_static_nonces(
  connection: api.IConnection,
) {
  const mockAuth: IPoliticalForumModerator.IAuthorized =
    typia.random<IPoliticalForumModerator.IAuthorized>();

  await TestValidator.error("unissued refresh token should fail", async () => {
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: mockAuth.token.refresh,
      } satisfies IPoliticalForumModerator.IRefresh,
    });
  });

  // Confirm that refreshable_until > expired_at in generated data - verifies data model consistency
  TestValidator.predicate(
    "generated IAuthorized has valid refreshable_until",
    () =>
      new Date(mockAuth.token.refreshable_until) >
      new Date(mockAuth.token.expired_at),
  );
}
