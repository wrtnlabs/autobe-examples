import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful administrator registration with valid credentials.
 *
 * Validates the complete administrator registration workflow including credential validation, request record creation, and token generation. Ensures that the system properly handles the registration process and returns the expected authorization response with proper account status.
 *
 * Special attention is given to verifying that the administrator account is created with valid credentials and that JWT tokens are properly generated with valid expiration timestamps. The registration must follow all security requirements including password strength validation and email uniqueness constraints.
 *
 * 1. Create admin-specific connection for registration.
 * 2. Submit administrator registration request with valid credentials.
 * 3. Validates response includes admin ID, email, and grade.
 * 4. Verifies JWT tokens with access, refresh, and expiration timestamps.
 * 5. Confirms account timestamps are properly set.
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Submit administrator registration request
  const authorized: IEcommerceAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123",
        reason: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  // 3. Validate response structure
  typia.assert(authorized);
  // 4. Verify admin ID is valid UUID
  TestValidator.predicate("admin ID is valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  // 5. Verify email format
  TestValidator.predicate("email is valid format", () =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorized.email),
  );
  // 6. Verify grade structure exists
  TestValidator.predicate(
    "grade has id",
    () => typeof authorized.grade.id === "string",
  );
  TestValidator.predicate(
    "grade has grade level",
    () => typeof authorized.grade.grade === "string",
  );
  // 7. Verify token structure
  TestValidator.predicate(
    "access token exists",
    () => authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => authorized.token.refresh.length > 0,
  );
  // 8. Verify expiration timestamps
  TestValidator.predicate(
    "expired_at is valid datetime",
    () => !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid datetime",
    () => !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
  // 9. Verify created_at and updated_at timestamps
  TestValidator.predicate(
    "created_at is valid datetime",
    () => !isNaN(Date.parse(authorized.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    () => !isNaN(Date.parse(authorized.updated_at)),
  );
  // 10. Verify deleted_at is null for active account
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
}
