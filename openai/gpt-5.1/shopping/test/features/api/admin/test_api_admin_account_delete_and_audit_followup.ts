import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";

export async function test_api_admin_account_delete_and_audit_followup(
  connection: api.IConnection,
) {
  // 1. Register Admin A (actor who will delete another admin)
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
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAAuth);

  // 2. Register Admin B (the admin account that will be deleted)
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
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminBAuth);

  // Store core identity fields for later checks
  const adminAId = adminAAuth.id;
  const adminAEmail = adminAAuth.email;
  const adminBId = adminBAuth.id;
  const adminBEmail = adminBAuth.email;

  // Sanity checks: ids and emails are correctly wired
  TestValidator.predicate(
    "admin A id is non-empty uuid",
    () => typeof adminAId === "string" && adminAId.length > 0,
  );
  TestValidator.predicate(
    "admin B id is non-empty uuid",
    () => typeof adminBId === "string" && adminBId.length > 0,
  );
  TestValidator.equals(
    "admin A email matches join body",
    adminAEmail,
    adminAJoinBody.email,
  );
  TestValidator.equals(
    "admin B email matches join body",
    adminBEmail,
    adminBJoinBody.email,
  );

  // 3. Log in as Admin B to create at least one historical session
  const adminBLoginBody = {
    email: adminBEmail,
    password: adminBJoinBody.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminBLoginAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminBLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminBLoginAuth);
  TestValidator.equals(
    "admin B login returns same admin id as join",
    adminBLoginAuth.id,
    adminBId,
  );

  // 4. Switch back to Admin A by logging in as Admin A
  const adminALoginBody = {
    email: adminAEmail,
    password: adminAJoinBody.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminALoginAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminALoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminALoginAuth);
  TestValidator.equals(
    "admin A login returns same admin id as join",
    adminALoginAuth.id,
    adminAId,
  );

  // 5. As Admin A, erase Admin B's account
  await api.functional.shoppingMall.admin.admins.erase(connection, {
    adminId: adminBId,
  });

  // 6. Verify that Admin B can no longer log in after deletion
  const adminBLoginAfterDeleteBody = {
    email: adminBEmail,
    password: adminBJoinBody.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  await TestValidator.error(
    "deleted admin B cannot log in anymore",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: adminBLoginAfterDeleteBody,
      });
    },
  );

  // 7. Optional: confirm Admin A can still log in, proving other admins unaffected
  const adminALoginAfterDeleteBody = {
    email: adminAEmail,
    password: adminAJoinBody.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminALoginAfterDeleteAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminALoginAfterDeleteBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminALoginAfterDeleteAuth);
  TestValidator.equals(
    "admin A can still log in after deleting admin B",
    adminALoginAfterDeleteAuth.id,
    adminAId,
  );
}
