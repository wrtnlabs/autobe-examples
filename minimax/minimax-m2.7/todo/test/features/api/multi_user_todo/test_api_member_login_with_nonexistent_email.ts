import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_with_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid email format address that does not exist in the system
  const nonexistentEmail = `nonexistent_${Date.now()}@nonexistent-test.com`;
  // Test 1: Login with non-existent email should return HTTP 401 Unauthorized
  await TestValidator.httpError(
    "login with non-existent email should return 401",
    401,
    async () =>
      await api.functional.multiUserTodo.auth.member.login(connection, {
        body: {
          email: nonexistentEmail satisfies string & tags.Format<"email">,
          password: "any_password_123",
          href: "http://localhost:3000/login" satisfies string &
            tags.Format<"uri">,
          referrer: "http://localhost:3000/" satisfies string &
            tags.Format<"uri">,
        },
      }),
  );
  // Test 2: Verify consistent behavior - login again with same non-existent email should still return 401
  await TestValidator.httpError(
    "second login attempt with same non-existent email should also return 401",
    401,
    async () =>
      await api.functional.multiUserTodo.auth.member.login(connection, {
        body: {
          email: nonexistentEmail satisfies string & tags.Format<"email">,
          password: "different_password_456",
          href: "http://localhost:3000/login" satisfies string &
            tags.Format<"uri">,
          referrer: "http://localhost:3000/" satisfies string &
            tags.Format<"uri">,
        },
      }),
  );
}
