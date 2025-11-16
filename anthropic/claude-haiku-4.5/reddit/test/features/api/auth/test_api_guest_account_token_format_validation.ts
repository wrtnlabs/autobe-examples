import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_guest_account_token_format_validation(
  connection: api.IConnection,
) {
  // Register a guest account
  const guestAccount: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guestAccount);

  // Validate guest account has required fields
  TestValidator.predicate(
    "guest account has id",
    guestAccount.id !== null && guestAccount.id !== undefined,
  );
  TestValidator.predicate(
    "guest account has token",
    guestAccount.token !== null && guestAccount.token !== undefined,
  );

  // Extract tokens
  const { access, refresh, expired_at, refreshable_until } = guestAccount.token;

  // Validate access token format
  TestValidator.predicate(
    "access token is a string",
    typeof access === "string",
  );
  TestValidator.predicate("access token is not empty", access.length > 0);

  // Validate JWT structure for access token (three parts separated by dots)
  const accessParts = access.split(".");
  TestValidator.equals(
    "access token has three JWT parts",
    accessParts.length,
    3,
  );

  // Validate each part is base64url encoded
  TestValidator.predicate(
    "access token header is valid base64url",
    /^[A-Za-z0-9_-]+$/.test(accessParts[0]) && accessParts[0].length > 0,
  );
  TestValidator.predicate(
    "access token payload is valid base64url",
    /^[A-Za-z0-9_-]+$/.test(accessParts[1]) && accessParts[1].length > 0,
  );
  TestValidator.predicate(
    "access token signature is valid base64url",
    /^[A-Za-z0-9_-]+$/.test(accessParts[2]) && accessParts[2].length > 0,
  );

  // Validate access token header
  try {
    const headerJson = JSON.parse(
      Buffer.from(accessParts[0], "base64").toString(),
    );
    TestValidator.predicate(
      "access token header has typ field",
      headerJson.typ !== undefined,
    );
    TestValidator.predicate(
      "access token header has alg field",
      headerJson.alg !== undefined,
    );
  } catch {
    throw new Error("Access token header is not valid JSON");
  }

  // Validate access token payload structure
  try {
    const payloadJson = JSON.parse(
      Buffer.from(accessParts[1], "base64").toString(),
    );
    TestValidator.predicate(
      "access token payload contains claims",
      Object.keys(payloadJson).length > 0,
    );
  } catch {
    throw new Error("Access token payload is not valid JSON");
  }

  // Validate refresh token format
  TestValidator.predicate(
    "refresh token is a string",
    typeof refresh === "string",
  );
  TestValidator.predicate("refresh token is not empty", refresh.length > 0);

  // Validate JWT structure for refresh token (three parts separated by dots)
  const refreshParts = refresh.split(".");
  TestValidator.equals(
    "refresh token has three JWT parts",
    refreshParts.length,
    3,
  );

  // Validate each part is base64url encoded
  TestValidator.predicate(
    "refresh token header is valid base64url",
    /^[A-Za-z0-9_-]+$/.test(refreshParts[0]) && refreshParts[0].length > 0,
  );
  TestValidator.predicate(
    "refresh token payload is valid base64url",
    /^[A-Za-z0-9_-]+$/.test(refreshParts[1]) && refreshParts[1].length > 0,
  );
  TestValidator.predicate(
    "refresh token signature is valid base64url",
    /^[A-Za-z0-9_-]+$/.test(refreshParts[2]) && refreshParts[2].length > 0,
  );

  // Validate expiration timestamps are ISO 8601 format
  TestValidator.predicate(
    "expired_at is ISO 8601 date-time string",
    typeof expired_at === "string" && /^\d{4}-\d{2}-\d{2}T/.test(expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is ISO 8601 date-time string",
    typeof refreshable_until === "string" &&
      /^\d{4}-\d{2}-\d{2}T/.test(refreshable_until),
  );

  // Validate timestamps are valid dates in the future
  const now = new Date();
  const expiredDate = new Date(expired_at);
  const refreshableDate = new Date(refreshable_until);

  TestValidator.predicate(
    "expired_at is a valid date",
    !isNaN(expiredDate.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is a valid date",
    !isNaN(refreshableDate.getTime()),
  );

  TestValidator.predicate(
    "expired_at is in the future",
    expiredDate.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableDate.getTime() > now.getTime(),
  );

  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableDate.getTime() >= expiredDate.getTime(),
  );

  // Validate Bearer token format
  const bearerToken = `Bearer ${access}`;
  TestValidator.predicate(
    "Bearer token can be constructed",
    bearerToken.startsWith("Bearer ") && bearerToken.split(" ").length === 2,
  );

  // Validate guest ID is UUID format
  TestValidator.predicate(
    "guest id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guestAccount.id,
    ),
  );
}
