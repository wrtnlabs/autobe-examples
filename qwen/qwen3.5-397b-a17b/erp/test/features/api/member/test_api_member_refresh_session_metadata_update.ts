import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test refresh token operation with optional session metadata updates.
 * 1. Create member account via join to obtain initial authentication tokens
 * 2. Call refresh endpoint with valid refresh_token and updated session metadata
 * 3. Verify response contains new access and refresh tokens
 * 4. Verify tokens are different from original tokens
 * 5. Validate response structure matches IAuthorized schema
 */
export async function test_api_member_refresh_session_metadata_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get initial tokens
  const joinResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
      phone_number: RandomGenerator.mobile(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Store original tokens for comparison
  const originalAccessToken = joinResult.token.access;
  const originalRefreshToken = joinResult.token.refresh;
  // 3. Create new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Call refresh with updated session metadata
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IRefresh,
  });
  typia.assert(refreshResult);
  // 5. Verify new tokens are generated (token rotation)
  TestValidator.notEquals(
    "access token refreshed",
    originalAccessToken,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token refreshed",
    originalRefreshToken,
    refreshResult.token.refresh,
  );
  // 6. Verify member data remains consistent
  TestValidator.equals(
    "member id matches",
    joinResult.member.id,
    refreshResult.member.id,
  );
  TestValidator.equals("email matches", joinResult.email, refreshResult.email);
  TestValidator.equals(
    "display name matches",
    joinResult.displayName,
    refreshResult.displayName,
  );
  // 7. Validate token structure
  typia.assert(refreshResult.token);
}
