import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform administrator can update the human-readable fields
 * of an existing admin role using its business code while preserving immutable
 * attributes.
 *
 * Business workflow validated by this test:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join to
 *    establish a platformAdmin session and Authorization header.
 * 2. Create a baseline admin role definition via POST
 *    /shoppingMall/platformAdmin/adminRoles with a unique `code`, `name`, and
 *    optional `description_text`.
 * 3. Update the same admin role using PUT
 *    /shoppingMall/platformAdmin/adminRoles/{adminRoleCode}, passing the
 *    original `code` in the path and an IShoppingMallAdminRole.IUpdate payload
 *    that changes `name` and `description_text`.
 * 4. Assert that the response reflects the updated human-readable fields while
 *    preserving immutable data such as `id`, `code`, and `created_at`, and that
 *    `updated_at` has advanced while `deleted_at` remains null.
 */
export async function test_api_admin_role_update_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (authentication bootstrap)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a baseline admin role
  const roleCode: string = RandomGenerator.alphaNumeric(8);
  const initialRoleBody = {
    code: roleCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: initialRoleBody,
      },
    );
  typia.assert(createdRole);

  // basic sanity checks on created role
  TestValidator.equals(
    "created role code should match requested code",
    createdRole.code,
    initialRoleBody.code,
  );
  TestValidator.equals(
    "created role name should match requested name",
    createdRole.name,
    initialRoleBody.name,
  );

  const originalId = createdRole.id;
  const originalCode = createdRole.code;
  const originalCreatedAt = createdRole.created_at;
  const originalUpdatedAt = createdRole.updated_at;

  // 3. Prepare update payload: change name and description_text
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });

  const updateBody = {
    name: updatedName,
    description_text: updatedDescription,
  } satisfies IShoppingMallAdminRole.IUpdate;

  const updatedRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.update(
      connection,
      {
        adminRoleCode: originalCode,
        body: updateBody,
      },
    );
  typia.assert(updatedRole);

  // 4. Validate immutable fields are preserved
  TestValidator.equals(
    "updated role id must remain identical",
    updatedRole.id,
    originalId,
  );
  TestValidator.equals(
    "updated role code must remain identical",
    updatedRole.code,
    originalCode,
  );
  TestValidator.equals(
    "created_at must remain unchanged after update",
    updatedRole.created_at,
    originalCreatedAt,
  );

  // 5. Validate mutable fields reflect update
  TestValidator.equals(
    "updated role name should match update payload",
    updatedRole.name,
    updatedName,
  );
  TestValidator.equals(
    "updated role description_text should match update payload",
    updatedRole.description_text,
    updatedDescription,
  );

  // 6. Validate updated_at advanced (lexicographically greater or at least different)
  TestValidator.predicate(
    "updated_at must not be earlier than original updated_at",
    updatedRole.updated_at >= originalUpdatedAt,
  );

  // `deleted_at` must still be null or undefined (not a non-null timestamp)
  TestValidator.predicate(
    "deleted_at should remain null or undefined after update",
    updatedRole.deleted_at === null || updatedRole.deleted_at === undefined,
  );
}
