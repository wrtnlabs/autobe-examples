import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

export async function test_api_admin_session_listing_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin join and authenticate to obtain access token
  const firstAdminInput = {
    email: `admin1_${RandomGenerator.alphaNumeric(8)}@test.com`,
    name: RandomGenerator.name(),
    password: "testpassword123",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;
  const firstAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: firstAdminInput });
  typia.assert(firstAdmin);

  // Step 2: Create a separate admin user whose sessions will be listed
  const secondAdminInput = {
    email: `admin2_${RandomGenerator.alphaNumeric(8)}@test.com`,
    name: RandomGenerator.name(),
    password: "testpassword123",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;
  const secondAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.create(connection, {
      body: secondAdminInput,
    });
  typia.assert(secondAdmin);

  // Step 3: Retrieve the list of active sessions for the second admin
  const sessionsPage: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.adminSessions.index(
      connection,
      {
        adminId: secondAdmin.id,
      },
    );
  typia.assert(sessionsPage);

  // Step 4: Validate pagination information
  const pagination: IPage.IPagination = sessionsPage.pagination;
  TestValidator.predicate(
    "pagination.current is a non-negative integer",
    typeof pagination.current === "number" && pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is a positive integer",
    typeof pagination.limit === "number" && pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records is a non-negative integer",
    typeof pagination.records === "number" && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is a non-negative integer",
    typeof pagination.pages === "number" && pagination.pages >= 0,
  );

  // Step 5: Validate session summaries
  for (const session of sessionsPage.data) {
    typia.assert(session);
    TestValidator.equals(
      "session.admin_id matches requested adminId",
      session.admin_id,
      secondAdmin.id,
    );
    TestValidator.predicate(
      "session.id is non-empty UUID string",
      typeof session.id === "string" && session.id.length > 0,
    );
    TestValidator.predicate(
      "session.created_at is non-empty string",
      typeof session.created_at === "string" && session.created_at.length > 0,
    );
    if (session.ip_address !== undefined && session.ip_address !== null) {
      TestValidator.predicate(
        "session.ip_address is string",
        typeof session.ip_address === "string",
      );
    }
    if (session.user_agent !== undefined && session.user_agent !== null) {
      TestValidator.predicate(
        "session.user_agent is string",
        typeof session.user_agent === "string",
      );
    }
  }
}
