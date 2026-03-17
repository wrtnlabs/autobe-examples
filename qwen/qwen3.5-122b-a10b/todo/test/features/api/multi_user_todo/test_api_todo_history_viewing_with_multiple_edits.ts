import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success path for viewing todo edit history.
 *
 * Since the provided SDK only includes member registration and history viewing
 * endpoints (no todo creation/editing APIs), this test validates:
 * 1. Member authentication flow
 * 2. History endpoint response structure
 * 3. Pagination metadata format
 * 4. Data array structure
 *
 * The test registers a member, then calls the history endpoint to verify
 * the response conforms to expected schema with proper pagination and data structure.
 */
export async function test_api_todo_history_viewing_with_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized);
  // 2. View todo history (with pagination parameters)
  const history =
    await api.functional.multiUserTodo.member.todo_histories.index(
      memberConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IMultiUserTodoTodoHistory.IRequest,
      },
    );
  typia.assert(history);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current exists",
    history.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit exists",
    history.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records exists",
    history.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages exists",
    history.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(history.data));
  TestValidator.predicate(
    "data length matches records",
    history.data.length <= history.pagination.records,
  );
  // 5. If there are history entries, validate their structure
  if (history.data.length > 0) {
    const firstEntry = history.data[0]!;
    typia.assert(firstEntry);
    TestValidator.predicate("entry has id", firstEntry.id.length > 0);
    TestValidator.predicate(
      "entry has changed_at",
      firstEntry.changed_at.length > 0,
    );
    TestValidator.predicate("entry has member", firstEntry.member !== null);
    // Member summary validation
    TestValidator.predicate("member has id", firstEntry.member.id.length > 0);
    TestValidator.predicate(
      "member has email",
      firstEntry.member.email.length > 0,
    );
    TestValidator.predicate(
      "member has name",
      firstEntry.member.name.length > 0,
    );
  }
}
