import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_registration_join(
  connection: api.IConnection,
) {
  // 1. Generate unique email and password hash
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(64); // simulate hashed password string

  // 2. Create admin with required fields
  const adminCreateBody = {
    email: uniqueEmail,
    password_hash: passwordHash,
    full_name: null,
    phone_number: null,
    status: "active" as const,
  } satisfies IShoppingMallAdmin.ICreate;

  // 3. Call join API
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(authorizedAdmin);

  // 4. Validate response fields
  TestValidator.equals(
    "admin email matches",
    authorizedAdmin.email,
    uniqueEmail,
  );
  TestValidator.equals(
    "admin status is active",
    authorizedAdmin.status,
    "active",
  );
  TestValidator.predicate(
    "token access is a non-empty string",
    typeof authorizedAdmin.token.access === "string" &&
      authorizedAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is a non-empty string",
    typeof authorizedAdmin.token.refresh === "string" &&
      authorizedAdmin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is a valid date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
      authorizedAdmin.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token refreshable_until is a valid date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
      authorizedAdmin.token.refreshable_until,
    ),
  );

  // 5. Attempt duplicate registration to test email uniqueness enforcement
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      const duplicateBody = {
        email: uniqueEmail,
        password_hash: RandomGenerator.alphaNumeric(64),
        full_name: null,
        phone_number: null,
        status: "active" as const,
      } satisfies IShoppingMallAdmin.ICreate;

      await api.functional.auth.admin.join(connection, { body: duplicateBody });
    },
  );
}
