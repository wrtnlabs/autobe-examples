import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_by_jwt_exp_min(
  connection: api.IConnection,
) {
  // Generate a valid refresh token for moderator authentication
  const refreshToken = `refresh_${typia.random<string & tags.Format<"uuid">>()}`;

  // Submit refresh token to obtain new access token
  const authorized: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IPoliticalForumModerator.IRefresh,
    });
  typia.assert(authorized);

  // Extract the JWT access token from the response
  const accessToken = authorized.token.access;

  // Decode the JWT token to inspect claims (base64URL decoding)
  const payloadBase64 = accessToken.split(".")[1];
  if (!payloadBase64) {
    throw new Error("Invalid JWT token format");
  }

  // Decode the base64URL encoded payload
  const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf-8");
  const payload = JSON.parse(payloadJson);

  // Validate that the 'iat' (issued at) and 'exp' (expiration) claims exist
  if (!payload.iat || !payload.exp) {
    throw new Error("JWT token is missing iat or exp claim");
  }

  // Calculate the time difference between exp and iat in seconds
  const issuedAt = payload.iat; // Unix timestamp in seconds
  const expiration = payload.exp; // Unix timestamp in seconds
  const ttlSeconds = expiration - issuedAt;

  // Validate that TTL is at least 15 minutes (900 seconds)
  TestValidator.predicate(
    "access token expiration time is at least 15 minutes after issuance",
    ttlSeconds >= 900,
  );
}
