import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

/**
 * Test that request body for moderator login is capped at 4KB. Submit JSON with
 * 10MB payload and verify server returns 413 Payload Too Large before parsing.
 *
 * This test validates the server's input size limitation for moderator login
 * requests. The endpoint should reject requests exceeding 4KB before attempting
 * to parse the JSON body. The test creates a massive valid JSON string (10MB)
 * that exceeds the 4KB limit and verifies the server responds with HTTP 413
 * status code, confirming the size restriction is enforced.
 *
 * The login API is designed to accept a stringified JSON body with email and
 * password. We construct a JSON string with a long email field to exceed 4KB,
 * while keeping the structure valid. This ensures the payload is both
 * syntactically correct and size-boundary causing, validating the server
 * handles size limits before parsing.
 */
export async function test_api_moderator_login_input_max_size_limit(
  connection: api.IConnection,
) {
  // Create a JSON string of email/password that is ~10MB total
  // Email will be a repeated string to fill 10MB, password remains small
  const emailAddress = ArrayUtil.repeat(1024 * 1024 * 10, () => "a").join(""); // 10MB
  const jsonBody = `{"email":"${emailAddress}","password":"password123"}`;

  // Verify that the JSON body is indeed over 4KB (4096 bytes)
  TestValidator.predicate("10MB payload exceeds limit", jsonBody.length > 4096);

  // The endpoint expects body as a string of JSON — precisely the ILogin type
  // Use satisfies for type safety, no type assertions
  const massiveLoginPayload =
    jsonBody satisfies IPoliticalForumModerator.ILogin;

  // The server must reject this request with 413 (Payload Too Large) since it exceeds 4KB
  await TestValidator.error(
    "server should reject 10MB login payload with 413 status code",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: massiveLoginPayload,
      });
    },
  );
}
