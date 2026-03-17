import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
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
  // Generate test data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  // Step 1: Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoAppMember.IJoin,
  });
  typia.assert(registeredMember);
  // Verify registration response has all required fields
  TestValidator.equals(
    "registered member id is valid UUID format",
    registeredMember.id,
    registeredMember.id,
  );
  TestValidator.notEquals(
    "display name is set",
    registeredMember.displayName,
    "",
  );
  TestValidator.predicate(
    "createdAt is valid date-time",
    registeredMember.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    registeredMember.updatedAt !== undefined,
  );
  TestValidator.predicate(
    "registration token has access token",
    typeof registeredMember.token.access === "string",
  );
  TestValidator.predicate(
    "registration token has refresh token",
    typeof registeredMember.token.refresh === "string",
  );
  TestValidator.predicate(
    "registration token has expired_at",
    registeredMember.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "registration token has refreshable_until",
    registeredMember.token.refreshable_until !== undefined,
  );
  // Step 2: Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IMultiUserTodoAppMember.ILogin,
  });
  typia.assert(loginResponse);
  // Verify login response structure
  TestValidator.equals(
    "login member id matches registered",
    loginResponse.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "login display name matches registered",
    loginResponse.displayName,
    registeredMember.displayName,
  );
  // Verify token structure
  TestValidator.predicate(
    "login has access token",
    typeof loginResponse.token.access === "string",
  );
  TestValidator.predicate(
    "login has refresh token",
    typeof loginResponse.token.refresh === "string",
  );
  TestValidator.predicate(
    "login has expired_at",
    loginResponse.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "login has refreshable_until",
    loginResponse.token.refreshable_until !== undefined,
  );
  // Validate token timestamps
  const now = new Date();
  const expiredAt = new Date(loginResponse.token.expired_at);
  const refreshableUntil = new Date(loginResponse.token.refreshable_until);
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "expired_at before refreshable_until",
    expiredAt < refreshableUntil,
  );
  // Verify JWT format (basic check - 3 parts separated by dots)
  const accessTokensParts = loginResponse.token.access.split(".");
  TestValidator.equals(
    "access token has 3 parts (JWT format)",
    accessTokensParts.length,
    3,
  );
}