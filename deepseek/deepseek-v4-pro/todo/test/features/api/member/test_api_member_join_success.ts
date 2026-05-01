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
 * Test successful member registration with email, password, and display name.
 *
 * Validates the complete join flow where a new member registers with a unique
 * email, a strong password, and a display name. The test verifies that the
 * server returns a properly structured IAuthorized response containing the
 * member's identity fields and JWT token pair.
 *
 * Special attention is given to verifying that all identity fields match the
 * submitted values, timestamps are set to the current time, deleted_at is null,
 * and the JWT token pair has valid expiration timestamps where refreshable_until
 * is strictly later than expired_at.
 *
 * 1. Register a new member with specific email, password, and display name.
 * 2. Validate that identity fields in the response match submitted values.
 * 3. Validate that timestamps are current and deleted_at is null.
 * 4. Validate the JWT token pair with non-empty strings and proper expiration ordering.
 */
export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = "alice@example.com";
  const displayName = "Alice";
  const result = await authorize_member_join(memberConnection, {
    body: {
      email,
      password: "StrongP@ssw0rd123!",
      display_name: displayName,
      href: "https://todoapp.example.com/register",
      referrer: "https://todoapp.example.com/",
      ip: "192.168.1.1",
    },
  });
  typia.assert(result);
  // Validate identity fields match submitted values
  TestValidator.equals("email matches submitted value", result.email, email);
  TestValidator.equals(
    "display_name matches submitted value",
    result.display_name,
    displayName,
  );
  // Validate deleted_at is null for a newly created account
  TestValidator.equals("deleted_at is null", result.deleted_at, null);
  // Validate timestamps are close to current time
  const now = new Date();
  const timeWindow = 60 * 1000;
  TestValidator.predicate(
    "created_at is close to current time",
    Math.abs(new Date(result.created_at).getTime() - now.getTime()) <
      timeWindow,
  );
  TestValidator.predicate(
    "updated_at is close to current time",
    Math.abs(new Date(result.updated_at).getTime() - now.getTime()) <
      timeWindow,
  );
  // Validate token fields
  TestValidator.predicate(
    "access token is non-empty",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    result.token.refresh.length > 0,
  );
  const expiredAt = new Date(result.token.expired_at);
  const refreshableUntil = new Date(result.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is later than expired_at",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
}
