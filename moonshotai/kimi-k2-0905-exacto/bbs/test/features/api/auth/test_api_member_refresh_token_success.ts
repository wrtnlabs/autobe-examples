import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";

/**
 * Test successful token refresh for economic discussion members.
 *
 * This test validates the core security mechanism of session management by
 * testing successful token refresh when valid refresh tokens are provided. It
 * ensures members can maintain their authenticated sessions without manual
 * re-authentication, enabling seamless participation in economic and political
 * discussions on the platform.
 *
 * The test follows these steps:
 *
 * 1. Generate a valid refresh token using typia.random
 * 2. Call the refresh endpoint with the refresh token
 * 3. Validate the response includes new tokens and member data
 * 4. Verify the response matches the expected IAuthorized structure
 */
export async function test_api_member_refresh_token_success(
  connection: api.IConnection,
) {
  // Generate a valid refresh token
  const refreshToken = typia.random<string>();

  // Create refresh request body
  const refreshRequest = {
    refresh_token: refreshToken,
  } satisfies IEconomicDiscussionMember.IRefresh;

  // Call the token refresh endpoint
  const response = await api.functional.auth.member.refresh(connection, {
    body: refreshRequest,
  });

  // Validate the response structure completely
  typia.assert(response);

  // Verify the response is the expected type
  TestValidator.equals(
    "response is authorized member type",
    typia.is<IEconomicDiscussionMember.IAuthorized>(response),
    true,
  );
}
