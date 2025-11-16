import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_registration_new_admin(
  connection: api.IConnection,
) {
  // 1. Register an initial admin user (joining admin actor) with valid data
  const firstAdminCreateBody = {
    email: `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    phone_number: null,
    role: "superadmin",
  } satisfies IShoppingMallAdmin.ICreate;

  const firstAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: firstAdminCreateBody,
    });
  typia.assert(firstAdmin);

  // 2. Create a new admin user with unique email and assigned role
  const newAdminCreateBody = {
    email: `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(14),
    phone_number: null,
    role: RandomGenerator.pick(["superadmin", "admin", "support"] as const),
  } satisfies IShoppingMallAdmin.ICreate;

  const newAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.create(connection, {
      body: newAdminCreateBody,
    });

  typia.assert(newAdmin);

  // 3. Validate that newAdmin properties correspond to create body with expected values
  TestValidator.equals(
    "new admin email matches input",
    newAdmin.email,
    newAdminCreateBody.email,
  );
  TestValidator.predicate(
    "new admin name is string and non-empty",
    typeof newAdmin.name === "string" && newAdmin.name.length > 0,
  );
  TestValidator.predicate(
    "new admin role is valid",
    ["superadmin", "admin", "support"].includes(newAdmin.role),
  );

  TestValidator.predicate(
    "new admin id is present and uuid format",
    typeof newAdmin.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        newAdmin.id,
      ),
  );

  TestValidator.predicate(
    "new admin account is active",
    newAdmin.is_active === true,
  );

  TestValidator.predicate(
    "new admin created_at timestamp is valid ISO date string",
    typeof newAdmin.created_at === "string" &&
      !isNaN(Date.parse(newAdmin.created_at)),
  );

  TestValidator.predicate(
    "new admin updated_at timestamp is valid ISO date string",
    typeof newAdmin.updated_at === "string" &&
      !isNaN(Date.parse(newAdmin.updated_at)),
  );

  // 4. Token is not exposed on newAdmin (not IAuthorized), so no token property
  TestValidator.predicate(
    "new admin token property is not present",
    !("token" in newAdmin),
  );

  // 5. Confirm firstAdmin token presence and validity of token properties
  TestValidator.predicate(
    "first admin has a token object",
    typeof firstAdmin.token === "object" && firstAdmin.token !== null,
  );
  TestValidator.predicate(
    "token object has access string",
    typeof firstAdmin.token.access === "string" &&
      firstAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "token object has refresh string",
    typeof firstAdmin.token.refresh === "string" &&
      firstAdmin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is valid ISO datetime string",
    typeof firstAdmin.token.expired_at === "string" &&
      !isNaN(Date.parse(firstAdmin.token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until is valid ISO datetime string",
    typeof firstAdmin.token.refreshable_until === "string" &&
      !isNaN(Date.parse(firstAdmin.token.refreshable_until)),
  );
}
