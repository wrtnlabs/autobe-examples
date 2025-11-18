import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

export async function test_api_admin_session_detail_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Create an admin and establish an authenticated admin context
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  const adminId = authorized.id;

  // 2. Discover at least one real session for that admin via the index endpoint
  const pageRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallAdminSession.IRequest;

  const sessionsPage: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId,
      body: pageRequest,
    });
  typia.assert<IPageIShoppingMallAdminSession.ISummary>(sessionsPage);

  TestValidator.predicate(
    "admin session index should return at least one session for freshly joined admin",
    sessionsPage.data.length > 0,
  );

  const targetSessionSummary: IShoppingMallAdminSession.ISummary =
    sessionsPage.data[0];
  const sessionId = targetSessionSummary.id;

  // 3. Sanity check: authenticated access to detail must succeed
  const detail: IShoppingMallAdminSession =
    await api.functional.shoppingMall.admin.admins.sessions.at(connection, {
      adminId,
      sessionId,
    });
  typia.assert<IShoppingMallAdminSession>(detail);
  TestValidator.equals(
    "authenticated admin should be able to read own session detail",
    detail.id,
    sessionId,
  );

  // 4. Prepare an unauthenticated connection (no Authorization header)
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Verify that unauthenticated access is rejected
  await TestValidator.error(
    "unauthenticated access to admin session detail must fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.sessions.at(
        unauthenticated,
        {
          adminId,
          sessionId,
        },
      );
    },
  );

  // 6. Prepare a connection with an obviously invalid token
  const invalidTokenConnection: api.IConnection = {
    ...connection,
    headers: {
      ...(connection.headers ?? {}),
      Authorization: "Bearer invalid-admin-token",
    },
  };

  // 7. Verify that invalid-token access is also rejected
  await TestValidator.error(
    "invalid token access to admin session detail must fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.sessions.at(
        invalidTokenConnection,
        {
          adminId,
          sessionId,
        },
      );
    },
  );
}
