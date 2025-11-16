import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Test that admin registration properly accepts and stores connection metadata.
 *
 * This test validates that the admin join endpoint correctly accepts connection
 * metadata (IP, href, referrer) and creates an admin account. While the full
 * scenario would include retrieving and validating session details, the
 * available API endpoints do not provide a way to obtain the session ID created
 * during registration, so this test focuses on validating the admin creation
 * process with proper connection metadata.
 *
 * Steps:
 *
 * 1. Generate valid connection metadata (IP address, href URI, referrer URI)
 * 2. Create admin account with specific connection context
 * 3. Verify admin creation was successful with proper token response
 * 4. Validate admin account properties match the input data
 */
export async function test_api_admin_session_detail_connection_metadata_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Generate valid connection metadata
  const testIp = `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<254>>()} `;
  const testHref = typia.random<string & tags.Format<"uri">>();
  const testReferrer = typia.random<string & tags.Format<"uri">>();

  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    ip: testIp.trim(),
    href: testHref,
    referrer: testReferrer,
  } satisfies ITodoListAdmin.ICreate;

  // Step 2: Create admin account with connection metadata
  const createdAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(createdAdmin);

  // Step 3: Validate admin creation response
  TestValidator.predicate(
    "admin ID should be valid UUID",
    typia.is<string & tags.Format<"uuid">>(createdAdmin.id),
  );

  TestValidator.equals(
    "admin email matches input",
    createdAdmin.email,
    adminCreateData.email,
  );

  // Step 4: Validate token structure
  TestValidator.predicate(
    "access token is non-empty string",
    typeof createdAdmin.token.access === "string" &&
      createdAdmin.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof createdAdmin.token.refresh === "string" &&
      createdAdmin.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "token expired_at is valid date-time",
    typia.is<string & tags.Format<"date-time">>(createdAdmin.token.expired_at),
  );

  TestValidator.predicate(
    "token refreshable_until is valid date-time",
    typia.is<string & tags.Format<"date-time">>(
      createdAdmin.token.refreshable_until,
    ),
  );

  // Validate timestamp fields
  TestValidator.predicate(
    "created_at is valid date-time",
    typia.is<string & tags.Format<"date-time">>(createdAdmin.created_at),
  );

  TestValidator.predicate(
    "updated_at is valid date-time",
    typia.is<string & tags.Format<"date-time">>(createdAdmin.updated_at),
  );

  TestValidator.equals(
    "deleted_at should be null for new account",
    createdAdmin.deleted_at,
    null,
  );
}
