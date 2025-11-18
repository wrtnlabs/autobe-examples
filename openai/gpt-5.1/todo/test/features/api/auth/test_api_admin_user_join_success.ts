import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate successful registration and authorization of a new admin user.
 *
 * Business purpose
 *
 * - Ensure a fresh administrative account can be created through the
 *   `/auth/adminUser/join` endpoint.
 * - Confirm that the backend returns a fully-populated
 *   `ITodoAppAdminUser.IAuthorized` object including JWT token information.
 * - Sanity check key business fields such as `email`, `status`, timestamps, and
 *   token expirations.
 *
 * Flow
 *
 * 1. Construct a valid `ITodoAppAdminUser.IJoin` payload with:
 *
 *    - Unique email
 *    - Strong password
 *    - Non-null display name
 *    - Status set to `"active"`
 *    - Realistic IP, href, and referrer values
 * 2. Call `api.functional.auth.adminUser.join`.
 * 3. Validate type structure using `typia.assert`.
 * 4. Verify business expectations via `TestValidator`:
 *
 *    - Email and status echo
 *    - Non-empty access/refresh tokens
 *    - Temporal sanity between created/updated and token expirations.
 */
export async function test_api_admin_user_join_success(
  connection: api.IConnection,
) {
  // 1. Build join payload with realistic values
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const displayName: string = RandomGenerator.name();

  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const ip: string = "127.0.0.1";

  const status = "active";

  const joinBody = {
    email,
    password,
    display_name: displayName,
    status,
    ip,
    href,
    referrer,
  } satisfies ITodoAppAdminUser.IJoin;

  // 2. Call join endpoint
  const authorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });

  // 3. Structural/type validation
  typia.assert(authorized);

  // 4. Business and consistency validations

  // 4-1. Email echo
  TestValidator.equals(
    "admin email should echo join request email",
    authorized.email,
    email,
  );

  // 4-2. Status echo
  TestValidator.equals(
    "admin status should echo join request status",
    authorized.status,
    status,
  );

  // 4-3. Token presence (non-empty access and refresh)
  TestValidator.predicate(
    "access token must be non-empty string",
    authorized.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token must be non-empty string",
    authorized.token.refresh.length > 0,
  );

  // 4-4. Timestamp parsing and ordering
  const createdAt = new Date(authorized.created_at);
  const updatedAt = new Date(authorized.updated_at);

  TestValidator.predicate(
    "created_at must be a valid date",
    !Number.isNaN(createdAt.getTime()),
  );

  TestValidator.predicate(
    "updated_at must be a valid date",
    !Number.isNaN(updatedAt.getTime()),
  );

  TestValidator.predicate(
    "updated_at must be greater than or equal to created_at",
    updatedAt.getTime() >= createdAt.getTime(),
  );

  // 4-5. Token expiry temporal sanity
  const now = new Date();
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);

  TestValidator.predicate(
    "token.expired_at must be a valid date",
    !Number.isNaN(expiredAt.getTime()),
  );

  TestValidator.predicate(
    "token.refreshable_until must be a valid date",
    !Number.isNaN(refreshableUntil.getTime()),
  );

  TestValidator.predicate(
    "access token expiration should be in the future",
    expiredAt.getTime() > now.getTime(),
  );

  TestValidator.predicate(
    "refreshable_until should be after or equal to expired_at",
    refreshableUntil.getTime() >= expiredAt.getTime(),
  );
}
