import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoViewStat";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoViewStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the basic success path for retrieving a member's todo view statistics.
 * Authenticate as a member, then call the view-stats endpoint with no filters
 * to retrieve paginated statistics. Verify the response includes proper
 * pagination metadata and contains view statistics records with expected fields.
 */
export async function test_api_view_stats_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication using join utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Call view-stats endpoint with empty request (no filters)
  const response = await api.functional.multiUserTodo.member.view_stats.index(
    memberConnection,
    {
      body: {} satisfies IMultiUserTodoTodoViewStat.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("page defaults to 1", response.pagination.current, 1);
  TestValidator.equals("limit defaults to 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.equals(
    "pages calculated correctly",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit) || 0,
  );
  // 4. Validate data array structure and member isolation
  for (const stat of response.data) {
    // Validate each record has expected fields (typia.assert already validated types)
    TestValidator.equals(
      "member ID matches authenticated user",
      stat.member.id,
      member.id,
    );
    // Verify todo can be null (for list views)
    if (stat.todo !== null) {
      // If there is a todo reference, it should have required fields
      typia.assert(stat.todo);
    }
  }
}
