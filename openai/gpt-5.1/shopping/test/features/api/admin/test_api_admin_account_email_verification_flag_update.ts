import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_admin_account_email_verification_flag_update(
  connection: api.IConnection,
) {
  // 1. Provision Admin A (operator) via join
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

  // 2. Provision Admin B (target) via join
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

  // Snapshot original Admin B fields from the authorized payload's scalar fields
  const originalBId = adminBAuth.id;
  const originalBEmail = adminBAuth.email;
  const originalBStatus = adminBAuth.status;
  const originalBEmailVerified = adminBAuth.email_verified;
  const originalBCreatedAt = adminBAuth.created_at;
  const originalBUpdatedAt = adminBAuth.updated_at;
  const originalBDeletedAt = adminBAuth.deleted_at;

  // 3. Ensure we operate as Admin A for privileged update by re-joining Admin A
  const adminARejoinAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminARejoinAuth);

  // 4. Update Admin B: set email_verified to true
  const firstUpdateBody = {
    email_verified: true,
  } satisfies IShoppingMallAdmin.IUpdate;

  const updatedOnce: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.update(connection, {
      adminId: originalBId,
      body: firstUpdateBody,
    });
  typia.assert(updatedOnce);

  // 5. Validate updatedOnce fields
  TestValidator.equals(
    "email_verified should be true after first update",
    updatedOnce.email_verified,
    true,
  );
  TestValidator.equals(
    "id should remain unchanged after first update",
    updatedOnce.id,
    originalBId,
  );
  TestValidator.equals(
    "email should remain unchanged after first update",
    updatedOnce.email,
    originalBEmail,
  );
  TestValidator.equals(
    "status should remain unchanged after first update",
    updatedOnce.status,
    originalBStatus,
  );
  TestValidator.equals(
    "created_at should remain unchanged after first update",
    updatedOnce.created_at,
    originalBCreatedAt,
  );
  TestValidator.equals(
    "deleted_at should remain unchanged after first update",
    updatedOnce.deleted_at,
    originalBDeletedAt,
  );
  TestValidator.notEquals(
    "updated_at should change after first update",
    updatedOnce.updated_at,
    originalBUpdatedAt,
  );

  // 6. Toggle back: set email_verified to false
  const secondUpdateBody = {
    email_verified: false,
  } satisfies IShoppingMallAdmin.IUpdate;

  const updatedTwice: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.update(connection, {
      adminId: originalBId,
      body: secondUpdateBody,
    });
  typia.assert(updatedTwice);

  // 7. Validate updatedTwice fields
  TestValidator.equals(
    "email_verified should be false after second update",
    updatedTwice.email_verified,
    false,
  );
  TestValidator.equals(
    "id should remain unchanged after second update",
    updatedTwice.id,
    originalBId,
  );
  TestValidator.equals(
    "email should remain unchanged after second update",
    updatedTwice.email,
    originalBEmail,
  );
  TestValidator.equals(
    "status should remain unchanged after second update",
    updatedTwice.status,
    originalBStatus,
  );
  TestValidator.equals(
    "created_at should remain unchanged after second update",
    updatedTwice.created_at,
    originalBCreatedAt,
  );
  TestValidator.equals(
    "deleted_at should remain unchanged after second update",
    updatedTwice.deleted_at,
    originalBDeletedAt,
  );
  TestValidator.notEquals(
    "updated_at should change again after second update",
    updatedTwice.updated_at,
    updatedOnce.updated_at,
  );
}
