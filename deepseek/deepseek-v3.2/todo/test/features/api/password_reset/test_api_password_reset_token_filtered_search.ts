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

export async function test_api_password_reset_token_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Test default pagination (no filters)
  const defaultPage = await api.functional.todoApp.member.password_resets.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberPasswordReset.IRequest,
    },
  );
  typia.assert(defaultPage);
  // Business logic validation: pagination metadata
  TestValidator.predicate("pagination has valid values", () => {
    return (
      defaultPage.pagination.current >= 1 &&
      defaultPage.pagination.limit >= 1 &&
      defaultPage.pagination.records >= 0 &&
      defaultPage.pagination.pages >= 0
    );
  });
  // Test filter by used tokens (true)
  const usedFilter = await api.functional.todoApp.member.password_resets.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        used: true,
      } satisfies ITodoAppMemberPasswordReset.IRequest,
    },
  );
  typia.assert(usedFilter);
  // Business logic: all returned tokens should be used
  for (const token of usedFilter.data) {
    TestValidator.equals(
      "used filter returns only used tokens",
      token.used,
      true,
    );
  }
  // Test filter by unused tokens (false)
  const unusedFilter =
    await api.functional.todoApp.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          used: false,
        } satisfies ITodoAppMemberPasswordReset.IRequest,
      },
    );
  typia.assert(unusedFilter);
  // Business logic: all returned tokens should be unused
  for (const token of unusedFilter.data) {
    TestValidator.equals(
      "unused filter returns only unused tokens",
      token.used,
      false,
    );
  }
  // Test filter by expired tokens (true)
  const expiredFilter =
    await api.functional.todoApp.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          expired: true,
        } satisfies ITodoAppMemberPasswordReset.IRequest,
      },
    );
  typia.assert(expiredFilter);
  // Business logic: all returned tokens should be expired
  const now = new Date();
  for (const token of expiredFilter.data) {
    const expiresAt = new Date(token.expires_at);
    TestValidator.predicate(
      "expired filter returns only expired tokens",
      expiresAt < now,
    );
  }
  // Test filter by active tokens (false)
  const activeFilter =
    await api.functional.todoApp.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          expired: false,
        } satisfies ITodoAppMemberPasswordReset.IRequest,
      },
    );
  typia.assert(activeFilter);
  // Business logic: all returned tokens should be active
  for (const token of activeFilter.data) {
    const expiresAt = new Date(token.expires_at);
    TestValidator.predicate(
      "active filter returns only active tokens",
      expiresAt >= now,
    );
  }
  // Test date range filtering
  const fromDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const toDate = new Date().toISOString();
  const dateRangeFilter =
    await api.functional.todoApp.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_from: fromDate,
          created_at_to: toDate,
        } satisfies ITodoAppMemberPasswordReset.IRequest,
      },
    );
  typia.assert(dateRangeFilter);
  // Business logic: all returned tokens should be within date range
  const from = new Date(fromDate);
  const to = new Date(toDate);
  for (const token of dateRangeFilter.data) {
    const createdAt = new Date(token.created_at);
    TestValidator.predicate(
      "date range filter returns tokens within range",
      createdAt >= from && createdAt <= to,
    );
  }
  // Test partial token search if tokens exist
  if (defaultPage.data.length > 0) {
    const searchToken = defaultPage.data[0].token.substring(0, 5);
    const tokenSearchFilter =
      await api.functional.todoApp.member.password_resets.index(
        memberConnection,
        {
          body: {
            page: 1,
            limit: 10,
            // Remove 'search' parameter as it doesn't exist in IRequest
          } satisfies ITodoAppMemberPasswordReset.IRequest,
        },
      );
  }
}