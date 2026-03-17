import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_list_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(auth);
  // 2. Query password reset list with expired status filter
  const expiredResult =
    await api.functional.multiUserTodo.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "expired",
          multi_user_todo_member_id: auth.id,
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(expiredResult);
  // 3. Query password reset list with valid status filter
  const validResult =
    await api.functional.multiUserTodo.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "valid",
          multi_user_todo_member_id: auth.id,
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(validResult);
  // 4. Query password reset list with upcoming status filter
  const upcomingResult =
    await api.functional.multiUserTodo.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "upcoming",
          multi_user_todo_member_id: auth.id,
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(upcomingResult);
  // 5. Validate pagination metadata exists
  TestValidator.predicate(
    "expired pagination exists",
    expiredResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "valid pagination exists",
    validResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "upcoming pagination exists",
    upcomingResult.pagination !== undefined,
  );
  // 6. Validate pagination values are non-negative
  TestValidator.predicate(
    "expired pagination current non-negative",
    expiredResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "valid pagination current non-negative",
    validResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "upcoming pagination current non-negative",
    upcomingResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "expired pagination limit non-negative",
    expiredResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "valid pagination limit non-negative",
    validResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "upcoming pagination limit non-negative",
    upcomingResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "expired pagination records non-negative",
    expiredResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "valid pagination records non-negative",
    validResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "upcoming pagination records non-negative",
    upcomingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "expired pagination pages non-negative",
    expiredResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "valid pagination pages non-negative",
    validResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "upcoming pagination pages non-negative",
    upcomingResult.pagination.pages >= 0,
  );
  // 7. Validate data arrays are defined
  TestValidator.predicate(
    "expired data is array",
    Array.isArray(expiredResult.data),
  );
  TestValidator.predicate(
    "valid data is array",
    Array.isArray(validResult.data),
  );
  TestValidator.predicate(
    "upcoming data is array",
    Array.isArray(upcomingResult.data),
  );
}
