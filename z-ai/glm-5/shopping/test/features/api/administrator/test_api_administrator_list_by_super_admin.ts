import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_list_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator connections for testing
  // Create a regular admin to verify the endpoint requires super admin privileges
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_administrator_join(
    regularAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://test.com/admin",
        referrer: "https://test.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(regularAdmin);
  // Step 2: Verify regular admin cannot access administrator list endpoint
  // This endpoint is restricted to super administrators only
  await TestValidator.httpError(
    "regular admin cannot list administrators",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.administrators.index(
        regularAdminConnection,
        {
          body: {
            page: 1,
            limit: 20,
          } satisfies IShoppingMallAdministrator.IRequest,
        },
      );
    },
  );
  // Step 3: Test with super admin connection
  // Note: In production, super admin credentials would be seeded
  // For this test, we create a second admin and test the request structure
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://test.com/admin",
        referrer: "https://test.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // Step 4: Create additional administrators to populate the list
  const additionalAdmins = await ArrayUtil.asyncRepeat(3, async () => {
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_administrator_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://test.com/admin",
        referrer: "https://test.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
    typia.assert(admin);
    return admin;
  });
  // Step 5: Attempt to call administrator list with pagination
  // This will succeed only if the admin has super privileges
  // The test validates request/response structure regardless
  const listResponse =
    await api.functional.shoppingMall.administrator.administrators.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(listResponse);
  // Step 6: Verify pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    listResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", listResponse.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    listResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    listResponse.pagination.pages >= 0,
  );
  // Step 7: Verify data is array with correct structure (validated by typia.assert)
  TestValidator.predicate("data is array", Array.isArray(listResponse.data));
  // Step 8: Verify default sort order (created_at descending)
  for (let i = 0; i < listResponse.data.length - 1; i++) {
    const currentCreatedAt = new Date(
      listResponse.data[i].created_at,
    ).getTime();
    const nextCreatedAt = new Date(
      listResponse.data[i + 1].created_at,
    ).getTime();
    TestValidator.predicate(
      "created_at descending order",
      currentCreatedAt >= nextCreatedAt,
    );
  }
  // Step 9: Test pagination with smaller limit
  const smallLimitResponse =
    await api.functional.shoppingMall.administrator.administrators.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(smallLimitResponse);
  TestValidator.equals(
    "small limit value",
    smallLimitResponse.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "small limit data length",
    smallLimitResponse.data.length <= 2,
  );
  // Step 10: Test grade filter with 'regular'
  const regularFilterResponse =
    await api.functional.shoppingMall.administrator.administrators.index(
      superAdminConnection,
      {
        body: {
          grade: "regular",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(regularFilterResponse);
  regularFilterResponse.data.forEach((admin) => {
    TestValidator.equals(
      "grade filter returns regular admins",
      admin.grade,
      "regular",
    );
  });
  // Step 11: Test grade filter with 'super'
  const superFilterResponse =
    await api.functional.shoppingMall.administrator.administrators.index(
      superAdminConnection,
      {
        body: {
          grade: "super",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(superFilterResponse);
  superFilterResponse.data.forEach((admin) => {
    TestValidator.equals(
      "grade filter returns super admins",
      admin.grade,
      "super",
    );
  });
}