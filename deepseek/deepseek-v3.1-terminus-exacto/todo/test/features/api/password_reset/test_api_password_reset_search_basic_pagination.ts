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

export async function test_api_password_reset_search_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Test basic pagination with page 1 and limit 20
  const searchRequest = {
    page: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >() satisfies number as number,
  } satisfies IMultiUserTodoMemberPasswordReset.IRequest;
  const response =
    await api.functional.multiUserTodo.member.members.password_resets.index(
      memberConnection,
      { body: searchRequest },
    );
  typia.assert(response);
  // Validate pagination metadata structure
  TestValidator.equals(
    "response has pagination",
    typeof response.pagination,
    "object",
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(response.data),
    true,
  );
  const { pagination } = response;
  // Validate pagination properties exist and have correct types
  TestValidator.equals(
    "pagination.current exists",
    typeof pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination.limit exists",
    typeof pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination.records exists",
    typeof pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination.pages exists",
    typeof pagination.pages,
    "number",
  );
  // Validate numeric constraints
  TestValidator.predicate("pagination.current >= 0", pagination.current >= 0);
  TestValidator.predicate("pagination.limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("pagination.records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination.pages >= 0", pagination.pages >= 0);
  // Validate pagination logic
  TestValidator.equals(
    "current page matches request",
    pagination.current,
    searchRequest.page,
  );
  TestValidator.equals(
    "limit matches request",
    pagination.limit,
    searchRequest.limit,
  );
  // Validate total pages calculation (handles division by zero)
  if (pagination.limit > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pages calculated correctly",
      pagination.pages,
      expectedPages,
    );
  }
  // Validate data length doesn't exceed limit
  TestValidator.predicate(
    "data length <= limit",
    response.data.length <= pagination.limit,
  );
  // Validate each item in data array
  for (const item of response.data) {
    typia.assert(item);
    // Validate required properties exist
    TestValidator.equals("item has id", typeof item.id, "string");
    TestValidator.equals("item has token", typeof item.token, "string");
    TestValidator.equals(
      "item has expires_at",
      typeof item.expires_at,
      "string",
    );
    TestValidator.equals(
      "item has used_at",
      typeof item.used_at === "string" || item.used_at === null,
      true,
    );
    TestValidator.equals(
      "item has created_at",
      typeof item.created_at,
      "string",
    );
    TestValidator.equals("item has member", typeof item.member, "object");
    // Validate member structure
    const { member } = item;
    TestValidator.equals("member has id", typeof member.id, "string");
    TestValidator.equals("member has email", typeof member.email, "string");
    TestValidator.equals(
      "member has display_name",
      typeof member.display_name,
      "string",
    );
    TestValidator.equals(
      "member has created_at",
      typeof member.created_at,
      "string",
    );
    // Validate date-time formats (basic ISO format check)
    TestValidator.predicate(
      "expires_at is ISO date",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(item.expires_at),
    );
    if (item.used_at !== null) {
      TestValidator.predicate(
        "used_at is ISO date",
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(item.used_at),
      );
    }
    TestValidator.predicate(
      "created_at is ISO date",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(item.created_at),
    );
    TestValidator.predicate(
      "member.created_at is ISO date",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(member.created_at),
    );
  }
}
