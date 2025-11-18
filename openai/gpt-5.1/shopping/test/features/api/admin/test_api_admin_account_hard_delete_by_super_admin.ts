import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";

export async function test_api_admin_account_hard_delete_by_super_admin(
  connection: api.IConnection,
) {
  // 1. Create Admin A (super-admin) via join
  const adminAJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminA: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminA);

  // Persist Admin A's credentials for later re-login
  const adminAEmail = adminAJoinBody.email;
  const adminAPassword = adminAJoinBody.password;

  // 2. Create Admin B (target to be deleted) via join
  const adminBJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminB: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminB);

  const adminBEmail = adminBJoinBody.email;
  const adminBPassword = adminBJoinBody.password;
  const adminBId = adminB.id;

  // 3. Baseline: Admin B can log in successfully
  const adminBLoginBody = {
    email: adminBEmail,
    password: adminBPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminBLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminBLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminBLogin);

  // Ensure the logged-in B identity matches the created B id
  TestValidator.equals(
    "admin B login should return the same admin id as join",
    adminBLogin.id,
    adminBId,
  );

  // 4. Switch back to Admin A by logging in again with Admin A credentials
  const adminALoginBody = {
    email: adminAEmail,
    password: adminAPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminALogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminALoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminALogin);

  // Sanity check: Admin A login matches original Admin A id
  TestValidator.equals(
    "admin A login should return the same admin id as join",
    adminALogin.id,
    adminA.id,
  );

  // 5. Perform hard delete of Admin B via erase
  await api.functional.shoppingMall.admin.admins.erase(connection, {
    adminId: adminBId,
  });

  // 6. After deletion, Admin B should no longer be able to log in
  const adminBLoginAfterDeleteBody = {
    email: adminBEmail,
    password: adminBPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  await TestValidator.error(
    "deleted admin B should not be able to log in anymore",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: adminBLoginAfterDeleteBody,
      });
    },
  );
}
