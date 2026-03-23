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
 * Test successful member registration with valid credentials.
 * Verifies account creation, response structure, and authentication token generation.
 */
export async function test_api_member_join_successful_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate random valid registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const displayName = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Register new member using utility function
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      display_name: displayName,
      href,
      referrer,
      ip,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Validate response structure
  typia.assert(authorized);
  // Verify business logic
  TestValidator.equals("email matches input", authorized.email, email);
  TestValidator.equals(
    "display name matches input",
    authorized.display_name,
    displayName,
  );
  TestValidator.predicate(
    "account is active (not deleted)",
    authorized.deleted_at === null,
  );
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  TestValidator.predicate(
    "has access token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at timestamp",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refreshable_until timestamp",
    authorized.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      authorized.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      authorized.updated_at,
    ),
  );
}
