import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_auth_user_refresh_invalid_token_rejection(
  connection: api.IConnection,
) {
  // Test Case 1: Malformed refresh token - completely random string
  const malformedToken = RandomGenerator.alphaNumeric(32); // Random non-JWT string

  await TestValidator.error(
    "should reject malformed refresh token - random format string",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: malformedToken,
          href: "https://example.com/refresh",
          referrer: "https://example.com/login",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Test Case 2: Token with JWT-like structure but invalid content
  const headerSegment = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"; // Valid JWT header
  const invalidPayloadSegment = "eyJzdWIiOiJ0ZXN0In0"; // Invalid/decode-failable
  const invalidSignatureSegment = "invalid_signature_not_valid_base64";

  await TestValidator.error(
    "should reject refresh token with invalid signature segment",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: `${headerSegment}.${invalidPayloadSegment}.${invalidSignatureSegment}`,
          href: "https://example.com/refresh",
          referrer: "https://example.com/login",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Test Case 3: Empty/blank refresh token
  await TestValidator.error("should reject empty refresh token", async () => {
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: "",
        href: "https://example.com/refresh",
        referrer: "https://example.com/login",
      } satisfies ITodoAppUser.IRefresh,
    });
  });

  // Test Case 4: Non-JWT format token
  const nonJwtToken = RandomGenerator.alphabets(24); // Random alphabet string

  await TestValidator.error(
    "should reject non-JWT format refresh token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: nonJwtToken,
          href: "https://example.com/refresh",
          referrer: "https://example.com/login",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Test Case 5: Token with valid JWT front but invalid remainder
  const validHeaderSegment = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"; // Valid JWT-looking
  const invalidRemainderSegment = "invalid_not_base64_url_safe_!@#$%";

  await TestValidator.error(
    "should reject refresh token with valid-looking start but corrupted content",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: `${validHeaderSegment}.${invalidRemainderSegment}.${invalidRemainderSegment}`,
          href: "https://example.com/refresh",
          referrer: "https://example.com/login",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );
}
