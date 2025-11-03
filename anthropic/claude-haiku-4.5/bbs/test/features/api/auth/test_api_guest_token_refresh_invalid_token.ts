import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_guest_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Test 1: Invalid token format - non-existent token
  await TestValidator.error(
    "should reject refresh with non-existent token",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardMember.IRefreshRequest,
      });
    },
  );

  // Test 2: Invalid token - empty string
  await TestValidator.error(
    "should reject refresh with empty token",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies IDiscussionBoardMember.IRefreshRequest,
      });
    },
  );

  // Test 3: Invalid token - corrupted/malformed token
  await TestValidator.error(
    "should reject refresh with malformed token",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(64),
        } satisfies IDiscussionBoardMember.IRefreshRequest,
      });
    },
  );

  // Test 4: Invalid token - whitespace only
  await TestValidator.error(
    "should reject refresh with whitespace token",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "   ",
        } satisfies IDiscussionBoardMember.IRefreshRequest,
      });
    },
  );
}
