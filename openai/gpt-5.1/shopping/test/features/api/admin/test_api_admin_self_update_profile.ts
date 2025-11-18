import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";

export async function test_api_admin_self_update_profile(
  connection: api.IConnection,
) {
  // 1. Register Admin A via /auth/admin/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  const originalId = authorized.id;
  const originalEmail = authorized.email;
  const originalUpdatedAt = authorized.updated_at;

  // 2. Prepare update payload: change email and status
  const newEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const newStatus = "suspended";

  const updateBody = {
    email: newEmail,
    status: newStatus,
  } satisfies IShoppingMallAdmin.IUpdate;

  const updatedAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.update(connection, {
      adminId: authorized.id,
      body: updateBody,
    });
  typia.assert<IShoppingMallAdmin>(updatedAdmin);

  // 3. Validate updated admin fields
  TestValidator.equals(
    "updated admin id should match original admin id",
    updatedAdmin.id,
    originalId,
  );
  TestValidator.equals(
    "updated admin email should match new email",
    updatedAdmin.email,
    newEmail,
  );
  TestValidator.equals(
    "updated admin status should match new status",
    updatedAdmin.status,
    newStatus,
  );

  TestValidator.predicate(
    "updated_at should change after profile update",
    updatedAdmin.updated_at !== originalUpdatedAt,
  );

  // 4. Re-login with new email and original password
  const loginBody = {
    email: newEmail,
    password: joinBody.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const reLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(reLogin);

  TestValidator.equals(
    "relogin admin id should be the same as original admin id",
    reLogin.id,
    originalId,
  );
  TestValidator.equals(
    "relogin admin email should match updated email",
    reLogin.email,
    newEmail,
  );
}
