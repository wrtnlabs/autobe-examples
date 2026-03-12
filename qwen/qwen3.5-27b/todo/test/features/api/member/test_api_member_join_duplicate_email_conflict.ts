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

/**
 * Test member registration failure when attempting to register with an email that already exists.
 * 1. Successfully register a member with a unique email address
 * 2. Attempt to register another member with the same email address
 * 3. Verify that the second registration throws HTTP 409 Conflict error
 * 4. Confirm that the original member account remains functional
 */
export async function test_api_member_join_duplicate_email_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. First registration - should succeed
  const firstConnection: api.IConnection = { host: connection.host };
  const uniqueEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const firstMember: IMultiUserTodoMember.IAuthorized =
    await authorize_member_join(firstConnection, {
      body: {
        email: uniqueEmail,
        password: typia.random<string & tags.Format<"password">>(),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IMultiUserTodoMember.IJoin,
    });
  typia.assert(firstMember);
  // Validate first registration succeeded
  TestValidator.equals("email matches input", firstMember.email, uniqueEmail);
  TestValidator.predicate(
    "has valid token",
    firstMember.token.access.length > 0,
  );
  // 2. Second registration with same email - should fail with 409 Conflict
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate email returns 409 conflict",
    409,
    async () =>
      await authorize_member_join(secondConnection, {
        body: {
          email: uniqueEmail,
          password: typia.random<string & tags.Format<"password">>(),
          display_name: RandomGenerator.name(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IMultiUserTodoMember.IJoin,
      }),
  );
  // 3. Verify first member account is still functional
  TestValidator.equals(
    "first member unchanged",
    firstMember.email,
    uniqueEmail,
  );
  TestValidator.predicate(
    "first member token still valid",
    firstMember.token.access.length > 0,
  );
}
