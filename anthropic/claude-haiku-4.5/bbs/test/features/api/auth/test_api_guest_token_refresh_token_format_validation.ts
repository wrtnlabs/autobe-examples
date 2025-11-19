import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function test_api_guest_token_refresh_token_format_validation(
  connection: api.IConnection,
) {
  // Test 1: Empty string should fail validation
  await TestValidator.error("empty refresh token should fail", async () => {
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  });

  // Test 2: Random text (not a JWT) should fail validation
  await TestValidator.error("random text token should fail", async () => {
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: "not-a-jwt-token",
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  });

  // Test 3: Malformed JWT (missing parts) should fail validation
  await TestValidator.error(
    "malformed jwt with missing parts should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );

  // Test 4: JWT-like token with invalid structure (too many parts) should fail validation
  await TestValidator.error("jwt with too many parts should fail", async () => {
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: "part1.part2.part3.part4",
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  });

  // Test 5: Whitespace-only token should fail validation
  await TestValidator.error(
    "whitespace-only refresh token should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "   ",
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );

  // Test 6: Single word without JWT structure should fail validation
  await TestValidator.error(
    "single word token without dots should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "onlyoneword",
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );
}
