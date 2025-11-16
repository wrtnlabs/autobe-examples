import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

/**
 * Validate administrator JWT token refresh using a valid refresh token.
 *
 * This test provides a valid administrator refresh token (simulated by
 * typia.random), calls the admin refresh endpoint, and validates that the
 * response contains a new JWT access/refresh pair and the full administrator
 * identity (IDiscussionBoardAdmin.IAuthorized). The test asserts complete
 * response type/structure compliance and presence of all critical identity,
 * status, and session fields. This ensures auditability and contract
 * correctness for admin token rotation flow.
 */
export async function test_api_admin_refresh_valid_token(
  connection: api.IConnection,
) {
  // Generate a realistic valid refresh token structure
  const refreshInput = typia.random<IDiscussionBoardAdmin.IRefresh>();

  // Request a new token pair with a valid admin refresh token
  const result: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: refreshInput,
    });

  // Assert structure: all key identity and token fields must exist
  typia.assert<IDiscussionBoardAdmin.IAuthorized>(result);
  // Additional business checks (core identity and token presence)
  TestValidator.predicate(
    "admin id is valid uuid",
    typeof result.id === "string" && result.id.length > 0,
  );
  TestValidator.predicate(
    "token.access and token.refresh are non-empty",
    typeof result.token.access === "string" &&
      result.token.access.length > 0 &&
      typeof result.token.refresh === "string" &&
      result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "admin status is_active is boolean",
    typeof result.is_active === "boolean",
  );
  TestValidator.predicate(
    "admin email format",
    typeof result.email === "string" && result.email.includes("@"),
  );
}
