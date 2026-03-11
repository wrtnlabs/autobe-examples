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

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate test credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(16);
  const testDisplayName = RandomGenerator.name();
  // Create a member account for testing
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      display_name: testDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(joinResponse);
  // Create a new connection for login (without authorization headers)
  const loginConnection: api.IConnection = { host: connection.host };
  // Attempt to log in with the same credentials
  const loginResponse = await authorize_member_login(loginConnection, {
    body: {
      email: testEmail,
      password: testPassword,
    } satisfies IMultiUserTodoMember.ILogin,
  });
  typia.assert(loginResponse);
  // Validate member information matches
  TestValidator.equals(
    "member ID should match",
    loginResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "member email should match",
    loginResponse.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "member display name should match",
    loginResponse.display_name,
    joinResponse.display_name,
  );
  // Validate token structure
  TestValidator.predicate(
    "access token should exist",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should exist",
    loginResponse.token.refresh.length > 0,
  );
  // Validate token expiration timestamps
  const expiredAt = new Date(loginResponse.token.expired_at);
  const refreshableUntil = new Date(loginResponse.token.refreshable_until);
  TestValidator.predicate(
    "expired_at should be valid date",
    !isNaN(expiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until should be valid date",
    !isNaN(refreshableUntil.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    refreshableUntil > expiredAt,
  );
  // Validate account timestamps
  const createdAt = new Date(loginResponse.created_at);
  const updatedAt = new Date(loginResponse.updated_at);
  TestValidator.predicate(
    "created_at should be valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    !isNaN(updatedAt.getTime()),
  );
  // Validate account is active (not deleted)
  TestValidator.equals(
    "deleted_at should be null",
    loginResponse.deleted_at,
    null,
  );
  // Validate connection headers are set after login
  TestValidator.predicate(
    "login connection should have authorization header",
    loginConnection.headers?.Authorization !== undefined,
  );
}
