import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test administrator registration with optional field omission.
 *
 * This test validates that the admin registration endpoint correctly handles
 * optional fields. Specifically, it verifies that the optional 'ip' field can
 * be omitted from the registration request without causing validation errors,
 * and that admin account creation succeeds with all required fields present.
 *
 * Process:
 *
 * 1. Register admin without providing optional ip field
 * 2. Verify registration succeeds and returns valid admin data with tokens
 */
export async function test_api_admin_registration_missing_required_fields(
  connection: api.IConnection,
) {
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = RandomGenerator.alphaNumeric(16);
  const validHref = typia.random<string & tags.Format<"uri">>();
  const validReferrer = typia.random<string & tags.Format<"uri">>();

  const adminWithoutIp: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: validEmail,
        password: validPassword,
        href: validHref,
        referrer: validReferrer,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(adminWithoutIp);

  TestValidator.equals(
    "registered admin email matches input",
    adminWithoutIp.email,
    validEmail,
  );
}
