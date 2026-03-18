import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account to obtain initial authentication tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(joinConnection, {
    body: {},
  });
  typia.assert(initialAuth);
  // Store original token values for comparison
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  const originalExpiredAt = initialAuth.token.expired_at;
  const originalRefreshableUntil = initialAuth.token.refreshable_until;
  // Step 2: Refresh tokens using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IErpHrmMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 3: Validate that new tokens are different from original tokens
  TestValidator.notEquals(
    "access token should be different after refresh",
    originalAccessToken,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different after refresh",
    originalRefreshToken,
    refreshedAuth.token.refresh,
  );
  // Step 4: Validate that expiration timestamps are updated
  TestValidator.notEquals(
    "expired_at should be updated after refresh",
    originalExpiredAt,
    refreshedAuth.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable_until should be updated after refresh",
    originalRefreshableUntil,
    refreshedAuth.token.refreshable_until,
  );
  // Step 5: Validate member profile information remains consistent
  TestValidator.equals(
    "member id should remain same",
    initialAuth.id,
    refreshedAuth.id,
  );
  TestValidator.equals(
    "member email should remain same",
    initialAuth.email,
    refreshedAuth.email,
  );
  TestValidator.equals(
    "member firstName should remain same",
    initialAuth.firstName,
    refreshedAuth.firstName,
  );
  TestValidator.equals(
    "member lastName should remain same",
    initialAuth.lastName,
    refreshedAuth.lastName,
  );
}
