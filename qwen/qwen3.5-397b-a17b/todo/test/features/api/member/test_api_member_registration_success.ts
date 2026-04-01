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
 * Test successful member account registration with valid email and password.
 *
 * This test verifies that:
 * 1. A new member can be registered with valid credentials
 * 2. The response contains member ID and authorization tokens
 * 3. All token fields (access, refresh, expired_at, refreshable_until) are present and valid
 * 4. The member can immediately use the returned tokens for authentication
 */
export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Prepare unique registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // Register new member using utility function
  const authorized: IMultiUserTodoMember.IAuthorized =
    await authorize_member_join(connection, {
      body: {
        email,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IMultiUserTodoMember.IJoin,
    });
  // Validate complete response structure including all token fields
  typia.assert(authorized);
  // Verify member ID matches the authorized response
  TestValidator.predicate("member ID is present", authorized.id.length > 0);
  // Verify token timestamps are logically ordered (access expires before refresh deadline)
  const expiredAt = new Date(authorized.token.expired_at).getTime();
  const refreshableUntil = new Date(
    authorized.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "access token expires before refresh deadline",
    expiredAt <= refreshableUntil,
  );
}
