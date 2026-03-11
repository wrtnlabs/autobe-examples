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

export async function test_api_password_reset_search_email_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple member accounts with different email patterns
  const members: IMultiUserTodoMember.IAuthorized[] = [];
  const memberConnections: api.IConnection[] = [];
  const emailPatterns = [
    "user1@example.com",
    "user2@domain.com",
    "user3@domain.org",
    "user4@example.org",
    "test.user@domain.com",
  ];
  for (const email of emailPatterns) {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: email,
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IMultiUserTodoMember.IJoin,
    });
    typia.assert(member);
    members.push(member);
    memberConnections.push(memberConnection);
  }
  // Test with different authorized connections to verify any member can access
  const searchConnections = [
    memberConnections[0],
    memberConnections[2],
    memberConnections[4],
  ];
  for (let i = 0; i < searchConnections.length; i++) {
    const connection = searchConnections[i];
    // Test 1: Exact email match
    const exactSearch =
      await api.functional.multiUserTodo.member.members.password_resets.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            email: "user2@domain.com",
          } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
        },
      );
    typia.assert(exactSearch);
    TestValidator.equals(
      `exact match empty results (connection ${i})`,
      exactSearch.data.length,
      0,
    );
    TestValidator.equals(
      `exact match total zero (connection ${i})`,
      exactSearch.pagination.records,
      0,
    );
    TestValidator.equals(
      `exact match page (connection ${i})`,
      exactSearch.pagination.current,
      1,
    );
    TestValidator.equals(
      `exact match limit (connection ${i})`,
      exactSearch.pagination.limit,
      10,
    );
    TestValidator.equals(
      `exact match pages (connection ${i})`,
      exactSearch.pagination.pages,
      0,
    );
    // Test 2: Partial email match
    const partialSearch =
      await api.functional.multiUserTodo.member.members.password_resets.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            email: "domain",
          } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
        },
      );
    typia.assert(partialSearch);
    TestValidator.equals(
      `partial match empty results (connection ${i})`,
      partialSearch.data.length,
      0,
    );
    TestValidator.equals(
      `partial match total zero (connection ${i})`,
      partialSearch.pagination.records,
      0,
    );
    TestValidator.equals(
      `partial match page (connection ${i})`,
      partialSearch.pagination.current,
      1,
    );
    TestValidator.equals(
      `partial match limit (connection ${i})`,
      partialSearch.pagination.limit,
      10,
    );
    TestValidator.equals(
      `partial match pages (connection ${i})`,
      partialSearch.pagination.pages,
      0,
    );
    // Test 3: Non-existent email search
    const noMatchSearch =
      await api.functional.multiUserTodo.member.members.password_resets.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            email: "nonexistent@email.com",
          } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
        },
      );
    typia.assert(noMatchSearch);
    TestValidator.equals(
      `no match empty results (connection ${i})`,
      noMatchSearch.data.length,
      0,
    );
    TestValidator.equals(
      `no match total zero (connection ${i})`,
      noMatchSearch.pagination.records,
      0,
    );
    TestValidator.equals(
      `no match page (connection ${i})`,
      noMatchSearch.pagination.current,
      1,
    );
    TestValidator.equals(
      `no match limit (connection ${i})`,
      noMatchSearch.pagination.limit,
      10,
    );
    TestValidator.equals(
      `no match pages (connection ${i})`,
      noMatchSearch.pagination.pages,
      0,
    );
    // Test 4: Empty string email filter
    const emptyEmailSearch =
      await api.functional.multiUserTodo.member.members.password_resets.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            email: "",
          } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
        },
      );
    typia.assert(emptyEmailSearch);
    TestValidator.equals(
      `empty email filter empty results (connection ${i})`,
      emptyEmailSearch.data.length,
      0,
    );
    TestValidator.equals(
      `empty email total zero (connection ${i})`,
      emptyEmailSearch.pagination.records,
      0,
    );
    TestValidator.equals(
      `empty email page (connection ${i})`,
      emptyEmailSearch.pagination.current,
      1,
    );
    TestValidator.equals(
      `empty email limit (connection ${i})`,
      emptyEmailSearch.pagination.limit,
      10,
    );
    TestValidator.equals(
      `empty email pages (connection ${i})`,
      emptyEmailSearch.pagination.pages,
      0,
    );
    // Test 5: Combined filter with other parameters
    const combinedSearch =
      await api.functional.multiUserTodo.member.members.password_resets.index(
        connection,
        {
          body: {
            page: 1,
            limit: 5,
            email: "example",
            expired: false,
            used: false,
          } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
        },
      );
    typia.assert(combinedSearch);
    TestValidator.equals(
      `combined filter empty results (connection ${i})`,
      combinedSearch.data.length,
      0,
    );
    TestValidator.equals(
      `combined filter total zero (connection ${i})`,
      combinedSearch.pagination.records,
      0,
    );
    TestValidator.equals(
      `combined filter page (connection ${i})`,
      combinedSearch.pagination.current,
      1,
    );
    TestValidator.equals(
      `combined filter limit (connection ${i})`,
      combinedSearch.pagination.limit,
      5,
    );
    TestValidator.equals(
      `combined filter pages (connection ${i})`,
      combinedSearch.pagination.pages,
      0,
    );
  }
}
