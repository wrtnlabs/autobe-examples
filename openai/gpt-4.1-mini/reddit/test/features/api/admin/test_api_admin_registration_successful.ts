import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";

export async function test_api_admin_registration_successful(
  connection: api.IConnection,
) {
  // 1. Prepare unique email and plaintext password for admin registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // realistic password

  // 2. Perform admin registration by calling the /auth/admin/join endpoint
  const adminAuthorization: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password,
      } satisfies IRedditCommunityAdmin.ICreate,
    });

  // 3. Assert the response type to ensure all fields are valid
  typia.assert(adminAuthorization);

  // 4. Validate critical properties values for expected behavior
  TestValidator.predicate(
    "admin has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      adminAuthorization.id,
    ),
  );
  TestValidator.equals(
    "admin email matches registration input",
    adminAuthorization.email,
    email,
  );
  TestValidator.predicate(
    "admin password_hash is set",
    typeof adminAuthorization.password_hash === "string" &&
      adminAuthorization.password_hash.length > 0,
  );
  TestValidator.predicate(
    "admin_level is positive integer",
    Number.isInteger(adminAuthorization.admin_level) &&
      adminAuthorization.admin_level > 0,
  );
  TestValidator.predicate(
    "created_at is ISO date-time string",
    typeof adminAuthorization.created_at === "string" &&
      adminAuthorization.created_at.length >= 20,
  );
  TestValidator.predicate(
    "updated_at is ISO date-time string",
    typeof adminAuthorization.updated_at === "string" &&
      adminAuthorization.updated_at.length >= 20,
  );
  TestValidator.equals(
    "deleted_at is null",
    adminAuthorization.deleted_at,
    null,
  );
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof adminAuthorization.token.access === "string" &&
      adminAuthorization.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof adminAuthorization.token.refresh === "string" &&
      adminAuthorization.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO date-time string",
    typeof adminAuthorization.token.expired_at === "string" &&
      adminAuthorization.token.expired_at.length >= 20,
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO date-time string",
    typeof adminAuthorization.token.refreshable_until === "string" &&
      adminAuthorization.token.refreshable_until.length >= 20,
  );
}
