import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMember";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_filter_email_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Create first test member
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "Alice Johnson",
      href: "https://example.com/todo",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member1);
  // Create second test member
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "Bob Williams",
      href: "https://example.com/todo",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member2);
  // Note: We need an admin connection for the members index endpoint
  // However, there's no admin authorization utility provided.
  // Based on the scenario and endpoint, we'll assume member connection works.
  // Create a fresh connection for search operations
  const searchConnection: api.IConnection = { host: connection.host };
  // Since there's no admin authorization, we'll use member1's connection
  // The token should be in member1Connection.headers
  searchConnection.headers = { ...member1Connection.headers };
  // Test 1: Exact email filter
  const emailFilterResult = await api.functional.todoApp.members.index(
    searchConnection,
    {
      body: {
        email: member1.email,
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(emailFilterResult);
  TestValidator.equals(
    "exact email filter returns correct member",
    emailFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "email filter matches correct member id",
    emailFilterResult.data[0].id,
    member1.id,
  );
  // Test 2: Display name trigram similarity search
  // Use partial display name (>2 chars) for trigram similarity
  const displayNameResult = await api.functional.todoApp.members.index(
    searchConnection,
    {
      body: {
        display_name: "Alice", // Partial match
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(displayNameResult);
  TestValidator.predicate(
    "display name search returns at least one result",
    displayNameResult.data.length >= 1,
  );
  TestValidator.predicate(
    "display name search includes matching member",
    displayNameResult.data.some((m) => m.id === member1.id),
  );
  // Test 3: Combined AND logic with email and display_name
  const combinedFilterResult = await api.functional.todoApp.members.index(
    searchConnection,
    {
      body: {
        email: member2.email,
        display_name: "Bob",
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filter returns exactly one matching member",
    combinedFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter matches correct member",
    combinedFilterResult.data[0].id,
    member2.id,
  );
  // Test 4: General search parameter (ILIKE across email and display_name)
  const searchResult = await api.functional.todoApp.members.index(
    searchConnection,
    {
      body: {
        search: "johnson", // Should match member1's display_name
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "general search returns at least one result",
    searchResult.data.length >= 1,
  );
  TestValidator.predicate(
    "general search includes matching member",
    searchResult.data.some((m) => m.id === member1.id),
  );
  // Test 5: Pagination validation
  const paginationResult = await api.functional.todoApp.members.index(
    searchConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit is respected",
    paginationResult.data.length,
    1,
  );
  TestValidator.predicate(
    "pagination metadata is valid",
    paginationResult.pagination.current === 1 &&
      paginationResult.pagination.limit === 1 &&
      paginationResult.pagination.records >= 2 &&
      paginationResult.pagination.pages >= 2,
  );
}
