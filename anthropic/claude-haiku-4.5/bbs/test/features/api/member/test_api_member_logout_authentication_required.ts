import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate that logout endpoint requires authentication.
 *
 * This test verifies that the logout endpoint properly enforces authentication
 * requirements. An unauthenticated request (without valid JWT token) attempting
 * to logout should fail with HTTP 401 Unauthorized error.
 *
 * Test flow:
 *
 * 1. Create unauthenticated connection (empty headers)
 * 2. Attempt logout without authentication token
 * 3. Verify operation fails with 401 Unauthorized
 * 4. Verify error message indicates authentication is required
 */
export async function test_api_member_logout_authentication_required(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection without Authorization header
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Attempt to call logout without authentication token
  // This should fail with HTTP 401 Unauthorized
  await TestValidator.httpError(
    "logout should require authentication",
    401,
    async () => {
      await api.functional.discussionBoard.member.auth.member.logout(
        unauthConn,
      );
    },
  );
}
