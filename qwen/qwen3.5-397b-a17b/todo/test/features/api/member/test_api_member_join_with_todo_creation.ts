import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member registration with email and password credentials.
 * Verifies that the join operation returns valid authentication tokens
 * (access token and refresh token) and creates a new member account.
 * Validates the complete registration flow including proper token generation
 * and member account creation.
 */
export async function test_api_member_join_with_todo_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and perform join using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  // Validate response structure with typia (comprehensive type validation)
  typia.assert(authorized);
  // Business logic validation: new accounts should not be deleted
  TestValidator.predicate(
    "new account is not deleted",
    authorized.deleted_at === null,
  );
  // Verify token timestamps are logically consistent
  TestValidator.predicate(
    "refresh valid until is after expired_at",
    new Date(authorized.token.refreshable_until) >=
      new Date(authorized.token.expired_at),
  );
}
