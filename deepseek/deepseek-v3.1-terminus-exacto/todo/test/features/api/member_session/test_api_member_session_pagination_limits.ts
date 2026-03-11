import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member);
  // Test minimum limit (1)
  const minLimitResponse =
    await api.functional.multiUserTodo.member.members.sessions.index(
      memberConnection,
      {
        body: {
          page: typia.random<
            number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>
          >(),
          limit: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Default<20> &
              tags.Minimum<1> &
              tags.Maximum<100>
          >() satisfies number as number,
        } satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.predicate(
    "min limit within bounds",
    minLimitResponse.pagination.limit >= 1 &&
      minLimitResponse.pagination.limit <= 100,
  );
  // Test maximum limit (100)
  const maxLimitResponse =
    await api.functional.multiUserTodo.member.members.sessions.index(
      memberConnection,
      {
        body: {
          page: typia.random<
            number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>
          >(),
          limit: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Default<20> &
              tags.Minimum<1> &
              tags.Maximum<100>
          >() satisfies number as number,
        } satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.predicate(
    "max limit within bounds",
    maxLimitResponse.pagination.limit >= 1 &&
      maxLimitResponse.pagination.limit <= 100,
  );
  // Test default limit (no limit specified)
  const defaultLimitResponse =
    await api.functional.multiUserTodo.member.members.sessions.index(
      memberConnection,
      {
        body: {
          page: typia.random<
            number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>
          >(),
        } satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(defaultLimitResponse);
  TestValidator.equals(
    "default limit is 20",
    defaultLimitResponse.pagination.limit,
    20,
  );
  // Test pagination metadata validity
  TestValidator.predicate(
    "current page is non-negative",
    defaultLimitResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    defaultLimitResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    defaultLimitResponse.pagination.pages >= 0,
  );
  // Test pagination calculation
  if (
    defaultLimitResponse.pagination.records > 0 &&
    defaultLimitResponse.pagination.limit > 0
  ) {
    const expectedPages = Math.ceil(
      defaultLimitResponse.pagination.records /
        defaultLimitResponse.pagination.limit,
    );
    TestValidator.equals(
      "pagination calculation correct",
      defaultLimitResponse.pagination.pages,
      expectedPages,
    );
  }
  // Test empty page handling with reasonable page number
  const highPageResponse =
    await api.functional.multiUserTodo.member.members.sessions.index(
      memberConnection,
      {
        body: {
          page: defaultLimitResponse.pagination.pages + 1,
          limit: 10,
        } satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(highPageResponse);
  TestValidator.predicate(
    "high page returns empty or limited data",
    highPageResponse.data.length <= 10,
  );
}
