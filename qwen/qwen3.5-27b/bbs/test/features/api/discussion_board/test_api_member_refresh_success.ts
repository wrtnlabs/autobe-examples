import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success path for member token refresh.
 * 1. Register a new member account to obtain initial access and refresh tokens
 * 2. Use the refresh token to call the refresh endpoint
 * 3. Verify that new tokens are different from original tokens (token rotation)
 * 4. Validate response structure and member profile information
 */
export async function test_api_member_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection for registration
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Register a new member to obtain initial tokens
  const initialAuth: IDiscussionBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(initialAuth);
  // Store original tokens for comparison
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  // 3. Create refresh request body with the refresh token
  const refreshBody = {
    refresh_token: originalRefreshToken,
  } satisfies IDiscussionBoardMember.IRefresh;
  // 4. Call refresh endpoint using utility function
  const refreshedAuth: IDiscussionBoardMember.IAuthorized =
    await authorize_member_refresh(memberConnection, {
      body: refreshBody,
    });
  typia.assert(refreshedAuth);
  // 5. Validate token rotation - new tokens should be different
  TestValidator.notEquals(
    "access token rotated",
    originalAccessToken,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    refreshedAuth.token.refresh,
  );
  // 6. Validate member profile information is preserved
  TestValidator.equals("member id preserved", initialAuth.id, refreshedAuth.id);
  TestValidator.equals(
    "display name preserved",
    initialAuth.display_name,
    refreshedAuth.display_name,
  );
  TestValidator.equals("bio preserved", initialAuth.bio, refreshedAuth.bio);
  // 7. Validate new tokens have valid expiration timestamps
  TestValidator.predicate(
    "access token has valid expiration",
    refreshedAuth.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refresh token has valid expiration",
    refreshedAuth.token.refreshable_until !== undefined,
  );
  // 8. Validate member is not banned
  TestValidator.equals("member not banned", refreshedAuth.banned, false);
  // 9. Validate member account is active (not deleted)
  TestValidator.equals("member account active", refreshedAuth.deleted_at, null);
}
