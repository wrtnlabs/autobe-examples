import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuth";

export async function test_api_auth_logout_without_authentication(
  connection: api.IConnection,
) {
  /**
   * Test logout request without valid authentication token.
   *
   * Verifies that the logout endpoint requires proper authentication and
   * rejects unauthenticated requests with HTTP 401 Unauthorized status. This
   * ensures that unauthorized users cannot terminate sessions or invalidate
   * tokens through the logout endpoint.
   */

  // Create an unauthenticated connection by removing auth headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Attempt logout without authentication - should fail with 401 Unauthorized
  await TestValidator.httpError(
    "logout without authentication should reject with 401 Unauthorized",
    401,
    async () => {
      await api.functional.todoApp.auth.logout(unauthenticatedConnection);
    },
  );
}
