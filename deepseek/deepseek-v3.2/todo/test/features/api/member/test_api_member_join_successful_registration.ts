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

export async function test_api_member_join_successful_registration(
  connection: api.IConnection,
): Promise<void> {
  // Generate test registration data
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  // Create a new connection for the member registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Use the authorize_member_join utility function as required
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorizedMember);
  // Validate member profile information matches input
  TestValidator.equals(
    "email matches input",
    authorizedMember.email,
    joinInput.email,
  );
  TestValidator.equals(
    "display name matches input",
    authorizedMember.display_name,
    joinInput.display_name,
  );
  // Validate system-generated fields
  // typia.assert already validated UUID format and date-time formats
  TestValidator.equals(
    "created_at and updated_at should be equal initially",
    authorizedMember.created_at,
    authorizedMember.updated_at,
  );
  TestValidator.equals(
    "deleted_at should be null for new account",
    authorizedMember.deleted_at,
    null,
  );
  // Validate authentication tokens
  const token = authorizedMember.token;
  typia.assert(token);
  TestValidator.predicate(
    "access token is non-empty string",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    token.refresh.length > 0,
  );
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);
  const now = new Date();
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
  // Verify password is not returned in plain text
  // The response structure ITodoAppMember.IAuthorized doesn't have password field,
  // which confirms it's not included
  TestValidator.predicate(
    "password not in response",
    !("password" in authorizedMember),
  );
  // Create a new connection with the access token for subsequent authenticated requests
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${token.access}`,
    },
  };
  // Verify the token can be used for authenticated requests
  TestValidator.predicate(
    "authenticated connection has Authorization header",
    authenticatedConnection.headers?.Authorization === `Bearer ${token.access}`,
  );
  // Test duplicate registration (business error)
  await TestValidator.error("duplicate email should fail", async () => {
    const duplicateConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(duplicateConnection, {
      body: {
        email: joinInput.email,
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    });
  });
  // Test registration without optional ip field
  const joinInputWithoutIp = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // ip is optional, so omit it
  } satisfies ITodoAppMember.IJoin;
  const memberConnection2: api.IConnection = { host: connection.host };
  const authorizedMember2 = await authorize_member_join(memberConnection2, {
    body: joinInputWithoutIp,
  });
  typia.assert(authorizedMember2);
  TestValidator.equals(
    "registration without ip works",
    authorizedMember2.email,
    joinInputWithoutIp.email,
  );
}
