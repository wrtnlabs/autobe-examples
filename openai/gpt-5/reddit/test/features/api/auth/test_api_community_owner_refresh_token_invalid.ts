import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityOwner";

/**
 * Reject invalid or malformed community owner refresh tokens.
 *
 * This test verifies the refresh endpoint for community owners denies invalid
 * or malformed refresh tokens and does not establish a new authorized session.
 * It performs two negative attempts using:
 *
 * 1. A clearly malformed token (not JWT-like)
 * 2. A JWT-like but invalid/expired-looking string
 *
 * Expectations and constraints:
 *
 * - Each call must throw an error; no status code assertion is performed.
 * - Request bodies strictly follow ICommunityPlatformCommunityOwner.IRefresh.
 * - No manipulation or inspection of connection.headers. SDK controls headers.
 */
export async function test_api_community_owner_refresh_token_invalid(
  connection: api.IConnection,
) {
  // Use an isolated, unauthenticated connection clone. Do not touch headers after creation.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Case 1: Clearly malformed token (not JWT-like)
  const malformedBody = {
    refresh_token: "not-a-jwt",
  } satisfies ICommunityPlatformCommunityOwner.IRefresh;

  await TestValidator.error("rejects malformed refresh token", async () => {
    await api.functional.auth.communityOwner.refresh(unauthConn, {
      body: malformedBody,
    });
  });

  // Case 2: JWT-like but invalid/expired token
  const jwtLikeInvalidBody = {
    refresh_token: "aaa.bbb.ccc",
  } satisfies ICommunityPlatformCommunityOwner.IRefresh;

  await TestValidator.error(
    "rejects JWT-like but invalid/expired refresh token",
    async () => {
      await api.functional.auth.communityOwner.refresh(unauthConn, {
        body: jwtLikeInvalidBody,
      });
    },
  );
}
