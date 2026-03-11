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
 * Test member registration with session context tracking for security auditing.
 *
 * This test validates that the member join endpoint properly captures session
 * context information (href, referrer, ip) for security audit logging and abuse
 * prevention. The test verifies that:
 * 1. A new member account can be created with valid registration data
 * 2. Session context fields are accepted and processed
 * 3. The response includes complete member information and JWT tokens
 * 4. The account is created in active state (deleted_at is null)
 * 5. Authentication tokens are properly generated for immediate access
 */
export async function test_api_member_join_with_session_context(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate registration data with session context
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  // Register new member with session context
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  // Validate response structure
  typia.assert(authorized);
  // Verify member information matches input
  TestValidator.equals("email matches", authorized.email, joinInput.email);
  TestValidator.equals(
    "display name matches",
    authorized.display_name,
    joinInput.displayName,
  );
  // Verify account is active (not soft deleted)
  TestValidator.equals("account is active", authorized.deleted_at, null);
  // Verify timestamps exist
  TestValidator.predicate("created_at exists", authorized.created_at !== null);
  TestValidator.predicate("updated_at exists", authorized.updated_at !== null);
  // Verify JWT tokens are present
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  // Verify token expiration timestamps
  TestValidator.predicate(
    "expired_at is valid date",
    authorized.token.expired_at !== null,
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    authorized.token.refreshable_until !== null,
  );
  // Verify member connection was updated with auth token
  TestValidator.predicate(
    "connection has auth header",
    memberConnection.headers?.Authorization !== undefined,
  );
}
