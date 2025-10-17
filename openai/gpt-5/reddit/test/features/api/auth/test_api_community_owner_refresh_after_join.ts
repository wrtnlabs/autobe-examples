import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityOwner";

export async function test_api_community_owner_refresh_after_join(
  connection: api.IConnection,
) {
  /** 1. Register a new community owner and capture the issued tokens */
  const ownerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[A-Za-z0-9_]{3,20}$">
    >(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<64>>(),
    display_name: RandomGenerator.name(),
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
    terms_accepted_at: typia.random<string & tags.Format<"date-time">>(),
    privacy_accepted_at: typia.random<string & tags.Format<"date-time">>(),
    marketing_opt_in: typia.random<boolean>(),
    marketing_opt_in_at: typia.random<string & tags.Format<"date-time">>(),
  } satisfies ICommunityPlatformCommunityOwner.ICreate;

  const firstAuth = await api.functional.auth.communityOwner.join(connection, {
    body: ownerJoinBody,
  });
  typia.assert(firstAuth);

  /** 2. Use the refresh token from join to obtain a new authorization */
  const refreshBody = {
    refresh_token: firstAuth.token.refresh,
  } satisfies ICommunityPlatformCommunityOwner.IRefresh;

  const refreshed = await api.functional.auth.communityOwner.refresh(
    connection,
    { body: refreshBody },
  );
  typia.assert(refreshed);

  // Business validations
  TestValidator.equals(
    "same owner id preserved across refresh",
    refreshed.id,
    firstAuth.id,
  );
  TestValidator.notEquals(
    "access token rotates on refresh",
    refreshed.token.access,
    firstAuth.token.access,
  );
  if (refreshed.role !== undefined) {
    TestValidator.equals(
      "role kind is communityOwner when present",
      refreshed.role,
      "communityOwner",
    );
  }

  /** 3. Negative case: invalid refresh token should fail */
  await TestValidator.error("invalid refresh token should fail", async () => {
    await api.functional.auth.communityOwner.refresh(connection, {
      body: {
        refresh_token: `invalid.${RandomGenerator.alphaNumeric(64)}`,
      } satisfies ICommunityPlatformCommunityOwner.IRefresh,
    });
  });
}
