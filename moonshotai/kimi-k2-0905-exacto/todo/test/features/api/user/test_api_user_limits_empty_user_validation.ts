import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserLimit";
import type { IPaginationBase } from "@ORGANIZATION/PROJECT-api/lib/structures/IPaginationBase";
import type { ISortOption } from "@ORGANIZATION/PROJECT-api/lib/structures/ISortOption";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserLimit";
import type { ITodoAppValidationRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppValidationRule";

/**
 * Test error handling when user limits are requested for a non-existent user
 * ID.
 *
 * This test validates that validation prevents access to invalid userIDs and
 * provides appropriate error responses for missing user scenarios. The user
 * must be authenticated first to establish the security context for the system
 * to validate against non-existent user references.
 *
 * 1. Create authenticated user
 * 2. Generate non-existent user ID
 * 3. Request user limits for non-existent user
 * 4. Verify appropriate error response
 */
export async function test_api_user_limits_empty_user_validation(
  connection: api.IConnection,
) {
  // 1. Create authenticated user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "12345678",
      ip: "192.168.1.1",
      href: "https://example.com",
      referrer: "https://referrer.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // 2. Generate non-existent user ID
  const nonExistentUserId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Request user limits for non-existent user
  const requestBody = {
    pagination: {
      page: 1,
      limit: 10,
    } satisfies IPaginationBase.ICreate,
  } satisfies ITodoAppUserLimit.IRequest;

  // 4. Verify appropriate error response
  await TestValidator.error(
    "requesting user limits for non-existent user should fail",
    async () => {
      await api.functional.todoApp.user.userLimits.user.index(connection, {
        userId: nonExistentUserId,
        body: requestBody,
      });
    },
  );
}
