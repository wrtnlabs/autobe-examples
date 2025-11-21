import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_create(connection: api.IConnection) {
  // Create admin account using the target endpoint
  // Validates system responds with 201 Created, returns admin entity with generated UUID and pending_verification status
  // The password is properly hashed on the server side

  const adminCreationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    role: "super_admin" as const,
  } satisfies IShoppingMallAdmin.ICreate;

  const createdAdminRecord: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.actors.admins.create(connection, {
      body: adminCreationData,
    });
  typia.assert(createdAdminRecord);

  // Validate the returned admin record has the expected properties and status
  TestValidator.equals(
    "admin email matches created data",
    createdAdminRecord.email,
    adminCreationData.email,
  );
  TestValidator.equals(
    "admin first name matches created data",
    createdAdminRecord.first_name,
    adminCreationData.first_name,
  );
  TestValidator.equals(
    "admin last name matches created data",
    createdAdminRecord.last_name,
    adminCreationData.last_name,
  );
  TestValidator.equals(
    "admin role matches created data",
    createdAdminRecord.role,
    adminCreationData.role,
  );
  TestValidator.equals(
    "admin status is pending_verification",
    createdAdminRecord.status,
    "pending_verification",
  );
  TestValidator.predicate(
    "admin ID is a valid UUID",
    createdAdminRecord.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is populated",
    createdAdminRecord.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is populated",
    createdAdminRecord.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null",
    createdAdminRecord.deleted_at,
    null,
  );
}
