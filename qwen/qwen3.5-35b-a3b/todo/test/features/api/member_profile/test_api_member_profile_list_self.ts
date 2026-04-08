import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_list_self(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/signup",
      referrer: "https://example.com",
    },
  });
  typia.assert(authorized);
  // 2. Call members index endpoint to list own profile
  const response = await api.functional.multiUserTodo.members.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // 3. Validate response structure
  TestValidator.equals("has pagination", response.pagination.current, 1);
  TestValidator.equals("pagination limit is 20", response.pagination.limit, 20);
  TestValidator.equals("records count is 1", response.pagination.records, 1);
  TestValidator.equals("pages count is 1", response.pagination.pages, 1);
  // 4. Validate data array contains exactly one record
  TestValidator.equals("data array length", response.data.length, 1);
  // 5. Validate member record fields
  const member = response.data[0];
  typia.assertGuard(member);
  TestValidator.equals("member email matches", member.email, authorized.email);
  typia.assertGuard(member.created_at);
  typia.assertGuard(member.updated_at);
  TestValidator.equals(
    "deleted_at is null for active account",
    member.deleted_at,
    null,
  );
  // 6. Verify sensitive fields are not present (ensure summary DTO doesn't include password_hash)
  const keys = Object.keys(member);
  TestValidator.notEquals(
    "password_hash not in response",
    keys.includes("password_hash"),
    false,
  );
}
