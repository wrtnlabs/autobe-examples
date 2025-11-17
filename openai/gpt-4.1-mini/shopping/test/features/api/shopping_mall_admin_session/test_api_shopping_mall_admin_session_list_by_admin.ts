import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

export async function test_api_shopping_mall_admin_session_list_by_admin(
  connection: api.IConnection,
) {
  // Authenticate a new admin to obtain authorized session
  const joinInput: IShoppingMallAdmin.IJoin = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "StrongPassword123!",
    ip: null,
    href: "https://example.com/admin/join",
    referrer: "https://example.com/previous",
  };
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinInput });
  typia.assert(adminAuthorized);

  // Create a shopping mall admin entity to test listing sessions
  const createInput: IShoppingMallAdmin.ICreate = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "StrongPassword123!",
  };
  const createdAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.create(
      connection,
      { body: createInput },
    );
  typia.assert(createdAdmin);

  // Authenticate again to ensure correct admin auth context
  const rejoinInput: IShoppingMallAdmin.IJoin = {
    email: joinInput.email,
    password: joinInput.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  };
  const reAuthorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: rejoinInput });
  typia.assert(reAuthorizedAdmin);

  // Prepare specific session query parameters
  const sessionRequest: IShoppingMallAdminSession.IRequest = {
    page: 1,
    limit: 10,
    search: "",
    sort_by: "created_at",
    order: "desc",
    expired_only: false,
  };

  // Query admin sessions of the created admin with filtering and pagination
  const sessionsPage: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.shoppingMallAdminSessions.index(
      connection,
      {
        shoppingMallAdminId: createdAdmin.id,
        body: sessionRequest,
      },
    );
  typia.assert(sessionsPage);

  // Validate pagination object
  TestValidator.predicate(
    "pagination current page >= 1",
    sessionsPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit between 1 and 100",
    sessionsPage.pagination.limit >= 1 && sessionsPage.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    sessionsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    sessionsPage.pagination.pages >= 0,
  );

  // Validate sessions data is array
  TestValidator.predicate(
    "sessions data is array",
    Array.isArray(sessionsPage.data),
  );

  // Validate individual session properties
  for (const session of sessionsPage.data) {
    typia.assert(session);
    TestValidator.equals(
      "session shoppingMallAdminId matches",
      session.shopping_mall_admin_id,
      createdAdmin.id,
    );
    TestValidator.predicate(
      "session id is uuid",
      typeof session.id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
          session.id,
        ),
    );
    TestValidator.predicate(
      "session ip is string",
      typeof session.ip === "string",
    );
    TestValidator.predicate(
      "session href is string",
      typeof session.href === "string",
    );
    TestValidator.predicate(
      "session referrer is string",
      typeof session.referrer === "string",
    );
    TestValidator.predicate(
      "session created_at is string",
      typeof session.created_at === "string",
    );
    TestValidator.predicate(
      "session expired_at nullable or string",
      session.expired_at === null || typeof session.expired_at === "string",
    );
  }
}
