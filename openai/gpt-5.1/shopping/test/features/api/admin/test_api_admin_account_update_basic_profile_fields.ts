import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate updating basic admin profile fields (email and status).
 *
 * Business flow (adapted to available APIs):
 *
 * 1. Register first admin (Admin A) using POST /auth/admin/join.
 * 2. Register second admin (Admin B) using POST /auth/admin/join again so that the
 *    connection ends up authenticated as an admin actor.
 * 3. Update Admin A's basic profile fields via PUT
 *    /shoppingMall/admin/admins/{adminId} using Admin A's id and a body of type
 *    IShoppingMallAdmin.IUpdate that changes email and status.
 * 4. Validate that immutable fields (id, created_at, deleted_at) are preserved
 *    while email, status and updated_at change appropriately.
 */
export async function test_api_admin_account_update_basic_profile_fields(
  connection: api.IConnection,
) {
  // 1. Register Admin A via /auth/admin/join
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminAAuth);

  // Capture immutable baseline from Admin A
  const originalAdminAId = adminAAuth.id;
  const originalAdminACreatedAt = adminAAuth.created_at;
  const originalAdminAUpdatedAt = adminAAuth.updated_at;
  const originalAdminADeletedAt = adminAAuth.deleted_at;

  // 2. Register Admin B via /auth/admin/join
  //    After this call, the connection is still authenticated as an admin
  //    actor, which is sufficient to exercise the update endpoint.
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminBAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminBAuth);

  // 3. Perform update on Admin A using PUT /shoppingMall/admin/admins/{adminId}
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newStatus = "active";

  const updateBody = {
    email: newEmail,
    status: newStatus,
  } satisfies IShoppingMallAdmin.IUpdate;

  const updatedAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.update(connection, {
      adminId: originalAdminAId,
      body: updateBody,
    });
  typia.assert(updatedAdmin);

  // 4. Validate immutable fields and updated properties
  TestValidator.equals(
    "admin id should remain unchanged after update",
    updatedAdmin.id,
    originalAdminAId,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedAdmin.created_at,
    originalAdminACreatedAt,
  );

  TestValidator.equals(
    "email should be updated to the new value",
    updatedAdmin.email,
    newEmail,
  );

  TestValidator.equals(
    "status should be updated to the new value",
    updatedAdmin.status,
    newStatus,
  );

  TestValidator.notEquals(
    "updated_at should advance after update",
    updatedAdmin.updated_at,
    originalAdminAUpdatedAt,
  );

  TestValidator.equals(
    "deleted_at should remain null after basic profile update",
    updatedAdmin.deleted_at,
    originalAdminADeletedAt,
  );
}
