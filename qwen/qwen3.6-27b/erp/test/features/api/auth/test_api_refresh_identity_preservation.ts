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
 * Test the primary refresh success path: member joins to get initial tokens, then immediately uses the refresh token to obtain new tokens.
 *
 * Validates the complete session renewal workflow without re-authentication. Ensures that the refresh operation returns a new set of valid tokens while preserving the authenticated member's identity. Confirms that token properties (access/refresh tokens) are rotated (different from originals), while identity properties (id, email, display_name) remain exactly the same. Also validates that expiration metadata (expired_at, refreshable_until) is present and valid in the refreshed response.
 *
 * 1. Create a new member account using join operation to obtain initial access/refresh tokens.
 * 2. Capture the original token set and member identity details for comparison.
 * 3. Submit a refresh request using the original refresh token.
 * 4. Verify the refresh returns a new authorized response.
 * 5. Validate new tokens differ from original tokens.
 * 6. Validate member identity is preserved across the token refresh.
 * 7. Validate expiration metadata exists in the new token response.
 */
export async function test_api_refresh_identity_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create isolated connection for the member actor
  const memberConnection = { host: connection.host };
  // 2. Prepare join request body with randomized data
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: "https://example.com",
    referrer: "https://example.com/referrer",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmPlatformMember.IJoin;
  // 3. Join member to get initial tokens and identity
  const joined = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  // 4. Prepare refresh request using the initial refresh token
  const refreshBody = {
    refresh_token: joined.token.refresh,
  } satisfies IHrmPlatformMember.IRefresh;
  // 5. Refresh tokens to get new session
  const refreshed = await authorize_member_refresh(memberConnection, {
    body: refreshBody,
  });
  typia.assert(refreshed);
  // 6. Validate tokens have been rotated (different from original)
  TestValidator.notEquals(
    "new access token differs from original",
    refreshed.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshed.token.refresh,
    joined.token.refresh,
  );
  // 7. Validate identity is preserved
  TestValidator.equals("identity id preserved", refreshed.id, joined.id);
  TestValidator.equals(
    "identity email preserved",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "identity display_name preserved",
    refreshed.display_name,
    joined.display_name,
  );
  // 8. Validate expiration metadata exists
  TestValidator.predicate(
    "token expiration metadata exists",
    !!refreshed.token.expired_at,
  );
  TestValidator.predicate(
    "refreshable until metadata exists",
    !!refreshed.token.refreshable_until,
  );
}
