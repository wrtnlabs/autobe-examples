import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the successful renewal of authentication tokens for an existing member session.
 *
 * Validates that a valid refresh token can be used to obtain new access and refresh tokens without requiring re-authentication. Ensures that the member identity is correctly preserved across the token refresh operation and that new tokens are generated with updated expiration timestamps.
 *
 * 1. Register a new member account and obtain initial access and refresh tokens.
 * 2. Store the original refresh token and member identity from the join response.
 * 3. Use the refresh token to call the token refresh endpoint.
 * 4. Verify that new access and refresh tokens are generated and differ from the originals.
 * 5. Confirm that member identity (id, email, display_name, created_at, updated_at, deleted_at) is correctly returned.
 * 6. Validate that token expiration timestamps (expired_at, refreshable_until) are present and valid.
 */
export async function test_api_member_refresh_successful_token_renewal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(joinResponse);
  // Store original tokens and identity for comparison
  const originalAccessToken = joinResponse.token.access;
  const originalRefreshToken = joinResponse.token.refresh;
  const originalMemberId = joinResponse.id;
  const originalEmail = joinResponse.email;
  const originalDisplayName = joinResponse.display_name;
  const originalCreatedAt = joinResponse.created_at;
  const originalUpdatedAt = joinResponse.updated_at;
  const originalDeletedAt = joinResponse.deleted_at;
  // 2. Create a new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Call refresh endpoint with the original refresh token
  const refreshResponse = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(refreshResponse);
  // 4. Validate that new tokens are generated and different from originals
  TestValidator.notEquals(
    "access token should be renewed",
    originalAccessToken,
    refreshResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be renewed",
    originalRefreshToken,
    refreshResponse.token.refresh,
  );
  // 5. Validate that member identity is preserved
  TestValidator.equals(
    "member id should be preserved",
    originalMemberId,
    refreshResponse.id,
  );
  TestValidator.equals(
    "member email should be preserved",
    originalEmail,
    refreshResponse.email,
  );
  TestValidator.equals(
    "member display_name should be preserved",
    originalDisplayName,
    refreshResponse.display_name,
  );
  TestValidator.equals(
    "member created_at should be preserved",
    originalCreatedAt,
    refreshResponse.created_at,
  );
  TestValidator.equals(
    "member updated_at should be preserved",
    originalUpdatedAt,
    refreshResponse.updated_at,
  );
  TestValidator.equals(
    "member deleted_at should be preserved",
    originalDeletedAt,
    refreshResponse.deleted_at,
  );
  // 6. Validate that token expiration timestamps are present
  TestValidator.predicate(
    "expired_at should be present",
    refreshResponse.token.expired_at !== undefined &&
      refreshResponse.token.expired_at !== null,
  );
  TestValidator.predicate(
    "refreshable_until should be present",
    refreshResponse.token.refreshable_until !== undefined &&
      refreshResponse.token.refreshable_until !== null,
  );
}
