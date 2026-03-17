import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

/**
 * Test the successful token refresh for a community owner.
 * Validates that owners can maintain long-lived sessions by trading refresh tokens for new token pairs without re-authentication.
 */
export async function test_api_owner_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new owner account to obtain initial tokens
  const ownerConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_owner_join(ownerConnection, {
    body: {},
  });
  typia.assert(initialAuth);
  // Capture original tokens for comparison
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  // Step 2: Create a new connection for the refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 3: Submit token refresh request with the valid refresh token
  const refreshedAuth = await authorize_owner_refresh(refreshConnection, {
    body: {
      refresh: originalRefreshToken,
    } satisfies IRedditLikeOwner.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 4: Verify owner profile information remains consistent
  TestValidator.equals("owner id", refreshedAuth.id, initialAuth.id);
  TestValidator.equals("owner email", refreshedAuth.email, initialAuth.email);
  TestValidator.equals(
    "owner username",
    refreshedAuth.username,
    initialAuth.username,
  );
  TestValidator.equals(
    "owner display_name",
    refreshedAuth.display_name,
    initialAuth.display_name,
  );
  TestValidator.equals(
    "owner is_active",
    refreshedAuth.is_active,
    initialAuth.is_active,
  );
  TestValidator.equals(
    "created_at",
    refreshedAuth.created_at,
    initialAuth.created_at,
  );
  // Step 5: Verify new tokens differ from original tokens
  TestValidator.notEquals(
    "access token should be different",
    originalAccessToken,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different",
    originalRefreshToken,
    refreshedAuth.token.refresh,
  );
  // Step 6: Verify updated_at timestamp has been updated
  TestValidator.predicate("updated_at should be updated after refresh", () => {
    return (
      new Date(refreshedAuth.updated_at) >= new Date(initialAuth.updated_at)
    );
  });
}
