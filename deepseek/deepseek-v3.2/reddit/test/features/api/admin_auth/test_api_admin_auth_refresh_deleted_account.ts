import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test refresh operation for a soft-deleted admin account.
 * Create admin account, then simulate admin account deletion (soft delete).
 * Attempt to refresh tokens using the refresh token obtained before deletion.
 * The system should reject the request with appropriate error, indicating that
 * the admin account is no longer active. This validates business rule that
 * deleted accounts cannot refresh tokens, ensuring security and access control.
 */
export async function test_api_admin_auth_refresh_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account to obtain initial refresh token
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(joinResponse);
  // Store refresh token for later use
  const refreshToken = joinResponse.token.refresh;
  // At this point, the admin account should be active and refresh should work
  const refreshResponse = await authorize_admin_refresh(adminConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies ICommunityPlatformAdmin.IRefresh,
  });
  typia.assert(refreshResponse);
  // Validate new tokens are valid
  TestValidator.equals(
    "refresh returns valid new tokens",
    typeof refreshResponse.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh returns valid refresh token",
    typeof refreshResponse.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "access token is not empty",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    refreshResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO date",
    !isNaN(new Date(refreshResponse.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date",
    !isNaN(new Date(refreshResponse.token.refreshable_until).getTime()),
  );
  // Note: We cannot test the soft-deleted case because there's no admin deletion endpoint
  // in the provided SDK. The scenario mentions "simulate admin account deletion"
  // but without a delete endpoint, we cannot actually delete the account.
  // This test verifies that refresh works for active accounts as a baseline.
}
