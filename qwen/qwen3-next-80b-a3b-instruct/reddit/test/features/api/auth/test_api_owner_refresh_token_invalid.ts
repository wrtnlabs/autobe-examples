import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_owner_refresh_token_invalid(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a valid owner account to obtain a refresh token
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized: ICommunityPlatformOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformOwner.IJoin,
    });
  typia.assert(authorized);
  // Step 2: Use the valid refresh token to confirm successful refresh (positive case)
  const validRefreshConnection: api.IConnection = { host: connection.host };
  const refreshed: ICommunityPlatformOwner.IAuthorized =
    await authorize_owner_refresh(validRefreshConnection, {
      body: {
        refreshToken: authorized.token.refresh,
      } satisfies ICommunityPlatformOwner.IRefresh,
    });
  typia.assert(refreshed);
  // Step 3: Test with empty refresh token (malformed)
  const emptyTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("empty refresh token should fail", async () => {
    await authorize_owner_refresh(emptyTokenConnection, {
      body: {
        refreshToken: "", // Invalid empty token
      } satisfies ICommunityPlatformOwner.IRefresh,
    });
  });
  // Step 4: Test with non-existent refresh token (revoked/invalid)
  const invalidTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("invalid refresh token should fail", async () => {
    await authorize_owner_refresh(invalidTokenConnection, {
      body: {
        refreshToken: "invalid-token-1234567890", // Non-existent token
      } satisfies ICommunityPlatformOwner.IRefresh,
    });
  });
}
