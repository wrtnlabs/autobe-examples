import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate creation of admin roles with null and non-null description_text.
 *
 * Business goal
 *
 * - Ensure a platform admin can create a role with description_text explicitly
 *   set to null, and the backend persists it as null while still populating
 *   lifecycle timestamps.
 * - Ensure a second role can be created in the same session with a non-null
 *   description_text, proving both code paths (null and non-null) behave
 *   correctly.
 *
 * Steps
 *
 * 1. Join as platform admin using /auth/platformAdmin/join.
 * 2. Create an admin role with description_text: null.
 * 3. Validate core fields and lifecycle timestamps, and that description_text is
 *    null.
 * 4. Create another admin role with a non-null description_text string.
 * 5. Validate that the second role has the provided description_text and proper
 *    lifecycle timestamps.
 */
export async function test_api_admin_role_creation_with_optional_description_null(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    // ip is optional and nullable; omit it to allow backend to treat as null
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create first role with description_text: null
  const firstRoleCode: string = RandomGenerator.alphaNumeric(12);
  const firstRoleName: string = RandomGenerator.name(2);

  const firstRoleBody = {
    code: firstRoleCode,
    name: firstRoleName,
    description_text: null,
  } satisfies IShoppingMallAdminRole.ICreate;

  const firstRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: firstRoleBody,
      },
    );
  typia.assert(firstRole);

  // Validate first role fields
  TestValidator.equals(
    "first role code should match request",
    firstRole.code,
    firstRoleCode,
  );
  TestValidator.equals(
    "first role name should match request",
    firstRole.name,
    firstRoleName,
  );
  TestValidator.equals(
    "first role description_text should be null",
    firstRole.description_text,
    null,
  );

  // created_at and updated_at must be non-empty ISO date-time strings
  TestValidator.predicate(
    "first role created_at should be non-empty string",
    typeof firstRole.created_at === "string" && firstRole.created_at.length > 0,
  );
  TestValidator.predicate(
    "first role updated_at should be non-empty string",
    typeof firstRole.updated_at === "string" && firstRole.updated_at.length > 0,
  );

  // deleted_at should be null or undefined for active roles
  TestValidator.predicate(
    "first role deleted_at should be null or undefined",
    firstRole.deleted_at === null || firstRole.deleted_at === undefined,
  );

  // 3. Create second role with non-null description_text
  const secondRoleCode: string = RandomGenerator.alphaNumeric(12);
  const secondRoleName: string = RandomGenerator.name(2);
  const secondRoleDescription: string = RandomGenerator.paragraph({
    sentences: 3,
  });

  const secondRoleBody = {
    code: secondRoleCode,
    name: secondRoleName,
    description_text: secondRoleDescription,
  } satisfies IShoppingMallAdminRole.ICreate;

  const secondRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: secondRoleBody,
      },
    );
  typia.assert(secondRole);

  // Validate second role fields
  TestValidator.equals(
    "second role code should match request",
    secondRole.code,
    secondRoleCode,
  );
  TestValidator.equals(
    "second role name should match request",
    secondRole.name,
    secondRoleName,
  );
  TestValidator.equals(
    "second role description_text should match request",
    secondRole.description_text,
    secondRoleDescription,
  );

  TestValidator.predicate(
    "second role created_at should be non-empty string",
    typeof secondRole.created_at === "string" &&
      secondRole.created_at.length > 0,
  );
  TestValidator.predicate(
    "second role updated_at should be non-empty string",
    typeof secondRole.updated_at === "string" &&
      secondRole.updated_at.length > 0,
  );

  TestValidator.predicate(
    "second role deleted_at should be null or undefined",
    secondRole.deleted_at === null || secondRole.deleted_at === undefined,
  );
}
