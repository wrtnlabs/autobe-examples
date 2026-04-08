import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberPasswordReset";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member with no password reset history receives an empty paginated response.
 *
 * Validates that the password reset list endpoint correctly handles the case where a member has never requested any password resets. The test verifies that the API returns valid pagination metadata with zero records and an empty data array, ensuring the endpoint gracefully handles empty result sets.
 *
 * This test confirms that:
 * - Empty password reset history returns valid pagination structure
 * - Pagination metadata correctly shows zero records and zero pages
 * - The data array is empty but present in the response
 * - Members can access their password reset history endpoint without errors even with no tokens
 *
 * 1. Create a member-specific connection from the base connection
 * 2. Register a new member account (which has no password reset tokens)
 * 3. Call the password reset list endpoint with default parameters
 * 4. Validate the response structure and pagination metadata
 * 5. Verify the data array is empty
 */
export async function test_api_password_reset_list_empty_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Call password reset list endpoint with default parameters
  const response =
    await api.functional.todoApp.member.member.password_resets.index(
      memberConnection,
      {
        body: {} satisfies ITodoAppMemberPasswordReset.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata for empty result set
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is default 10", response.pagination.limit, 10);
  TestValidator.equals("records count is 0", response.pagination.records, 0);
  TestValidator.equals("pages count is 0", response.pagination.pages, 0);
  // 4. Verify data array is empty
  TestValidator.equals("data array is empty", response.data.length, 0);
}
