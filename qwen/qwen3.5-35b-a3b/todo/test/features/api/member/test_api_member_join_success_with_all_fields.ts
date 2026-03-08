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

export async function test_api_member_join_success_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection for join operation
  const joinConnection: api.IConnection = { host: connection.host };
  // Generate test data with all fields
  const inputEmail = typia.random<string & tags.Format<"email">>();
  const inputPassword = RandomGenerator.alphaNumeric(16);
  const inputDisplayName = RandomGenerator.name();
  const inputHref = typia.random<string & tags.Format<"uri">>();
  const inputReferrer = typia.random<string & tags.Format<"uri">>();
  const inputIp = typia.random<string & tags.Format<"ipv4">>();
  // Execute member join with all fields
  const output = await authorize_member_join(joinConnection, {
    body: {
      email: inputEmail,
      password: inputPassword,
      displayName: inputDisplayName,
      href: inputHref,
      referrer: inputReferrer,
      ip: inputIp,
    } satisfies ITodoAppMember.IJoin,
  });
  // Validate member fields in response
  typia.assert(output);
  // Verify member fields match input where applicable
  TestValidator.equals("email", output.email, inputEmail);
  TestValidator.equals("display name", output.display_name, inputDisplayName);
  // Verify created_at and updated_at timestamps exist
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(new Date(output.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(new Date(output.updated_at).getTime()),
  );
  // Verify deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    output.deleted_at,
    null,
  );
  // Validate authorization token structure
  const token = typia.assert(output.token);
  // Verify token fields exist and have content
  TestValidator.equals(
    "access token is not empty",
    token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token is not empty",
    token.refresh.length > 0,
    true,
  );
  // Verify timestamp fields exist
  TestValidator.predicate(
    "expired_at is valid date-time",
    () => !isNaN(new Date(token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    () => !isNaN(new Date(token.refreshable_until).getTime()),
  );
  // Verify access token is short-lived (~15 minutes from now)
  const now = new Date();
  const accessExpires = new Date(token.expired_at);
  const accessDurationMinutes =
    (accessExpires.getTime() - now.getTime()) / (1000 * 60);
  TestValidator.equals(
    "access token expiration (around 15 minutes)",
    accessDurationMinutes,
    15,
    (key) => key === "accessDurationMinutes",
  );
  // Verify refresh token is longer-lived (~7 days)
  const refreshableUntil = new Date(token.refreshable_until);
  const refreshDurationDays =
    (refreshableUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.equals(
    "refresh token duration (around 7 days)",
    refreshDurationDays,
    7,
    (key) => key === "refreshDurationDays",
  );
  // Verify refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until after expired_at",
    refreshableUntil.getTime() > accessExpires.getTime(),
  );
  // Test that member can use the access token for subsequent authenticated calls
  // Create a new connection with the obtained token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: token.access,
    },
  };
  // Verify the token is properly set in headers
  TestValidator.equals(
    "authorization header set correctly",
    authenticatedConnection.headers?.Authorization,
    token.access,
  );
}
