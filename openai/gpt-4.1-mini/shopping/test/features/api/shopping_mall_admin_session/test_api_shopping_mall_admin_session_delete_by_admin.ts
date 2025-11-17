import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Test the deletion workflow for an admin session. Authenticate as admin by
 * creating an admin account via join API, create an admin session linked to
 * this admin, then delete the session. Verify that the session is successfully
 * deleted and that only authorized admins can perform this action. Validate
 * access controls and permissions enforcement.
 */
export async function test_api_shopping_mall_admin_session_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin authentication by join
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        ip: null,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(adminAuth);

  // 2. Create a platform administrator
  const admin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "password123",
        } satisfies IShoppingMallAdmin.ICreate,
      },
    );
  typia.assert(admin);

  // 3. Create an admin session linked to the admin
  const session: IShoppingMallAdminSession =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.shoppingMallAdminSessions.create(
      connection,
      {
        shoppingMallAdminId: admin.id,
        body: {
          ip: "127.0.0.1",
          href: "https://admin.example.com/dashboard",
          referrer: "https://admin.example.com/login",
        } satisfies IShoppingMallAdminSession.ICreate,
      },
    );
  typia.assert(session);

  // 4. Delete the created admin session
  await api.functional.shoppingMall.admin.shoppingMallAdmins.shoppingMallAdminSessions.erase(
    connection,
    {
      shoppingMallAdminId: admin.id,
      shoppingMallAdminSessionId: session.id,
    },
  );

  // 5. Verify that deleting a session without authentication fails
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated delete attempt should fail",
    async () => {
      await api.functional.shoppingMall.admin.shoppingMallAdmins.shoppingMallAdminSessions.erase(
        unauthenticatedConnection,
        {
          shoppingMallAdminId: admin.id,
          shoppingMallAdminSessionId: session.id,
        },
      );
    },
  );

  // 6. Authenticate as another admin
  const anotherAdminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        ip: null,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(anotherAdminAuth);

  // 7. Verify that deleting a session with the other admin fails
  await TestValidator.error(
    "other admin should not delete the session",
    async () => {
      await api.functional.shoppingMall.admin.shoppingMallAdmins.shoppingMallAdminSessions.erase(
        connection,
        {
          shoppingMallAdminId: admin.id,
          shoppingMallAdminSessionId: session.id,
        },
      );
    },
  );
}
