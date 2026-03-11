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
 * Test member registration with complete session context information including href, referrer, and optional IP address.
 * This validates that the system properly handles and records session context during registration as specified in
 * the IMultiUserTodoMember.IJoin schema. The registration should succeed with all provided context fields, and
 * the response should include valid authentication tokens.
 */
export async function test_api_member_join_with_session_context(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for member registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Test case 1: Registration with all session context fields including IP
  const authorizedMember1 = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!" satisfies string & tags.Format<"password">,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/home" satisfies string &
        tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorizedMember1);
  // Validate response structure
  TestValidator.predicate("has member ID", authorizedMember1.id !== undefined);
  TestValidator.predicate(
    "has valid email",
    authorizedMember1.email !== undefined,
  );
  TestValidator.equals(
    "display name present",
    typeof authorizedMember1.display_name,
    "string",
  );
  TestValidator.predicate(
    "has created at timestamp",
    authorizedMember1.created_at !== undefined,
  );
  TestValidator.predicate(
    "has valid token",
    authorizedMember1.token !== undefined,
  );
  TestValidator.predicate(
    "token has access field",
    authorizedMember1.token.access !== undefined,
  );
  TestValidator.predicate(
    "token has refresh field",
    authorizedMember1.token.refresh !== undefined,
  );
  TestValidator.predicate(
    "token has expired_at",
    authorizedMember1.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "token has refreshable_until",
    authorizedMember1.token.refreshable_until !== undefined,
  );
  // Test case 2: Registration without optional IP field
  const authorizedMember2 = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AnotherPassword456!" satisfies string &
        tags.Format<"password">,
      display_name: RandomGenerator.name(),
      href: "https://app.example.com/signup" satisfies string &
        tags.Format<"uri">,
      referrer: "https://app.example.com/" satisfies string &
        tags.Format<"uri">,
    },
  });
  typia.assert(authorizedMember2);
  // Validate second registration
  TestValidator.predicate(
    "second member has ID",
    authorizedMember2.id !== undefined,
  );
  TestValidator.predicate(
    "second member has email",
    authorizedMember2.email !== undefined,
  );
  TestValidator.notEquals(
    "different member IDs",
    authorizedMember1.id,
    authorizedMember2.id,
  );
  TestValidator.notEquals(
    "different emails",
    authorizedMember1.email,
    authorizedMember2.email,
  );
}
