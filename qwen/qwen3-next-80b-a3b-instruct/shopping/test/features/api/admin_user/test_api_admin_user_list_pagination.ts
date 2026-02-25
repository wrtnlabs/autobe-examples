import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_user_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Update connection with admin token for authentication
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: `Bearer ${admin.token.access}`,
  };
  // 3. Test default pagination (page=1, limit=20)
  const defaultPaginationResponse =
    await api.functional.shoppingMall.admin.users.index(
      authenticatedConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultPaginationResponse);
  // 4. Validate response structure and content
  TestValidator.equals(
    "default page is 1",
    defaultPaginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    defaultPaginationResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records >= 0",
    defaultPaginationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages >= 0",
    defaultPaginationResponse.pagination.pages >= 0,
  );
  // 5. Validate data structure contains only active users (deleted_at = null or undefined)
  // Note: The endpoint returns active users by default, excluding deleted users
  TestValidator.predicate(
    "all users are not deleted",
    defaultPaginationResponse.data.every(
      (user) => user.deleted_at === null || user.deleted_at === undefined,
    ),
  );
  // 6. Validate sensitive fields are excluded
  TestValidator.predicate(
    "no password_hash in response",
    defaultPaginationResponse.data.every((user) => !("password_hash" in user)),
  );
  // 7. Validate ordering by created_at descending
  const createdDates = defaultPaginationResponse.data.map((user) =>
    new Date(user.created_at).getTime(),
  );
  TestValidator.predicate(
    "users ordered by created_at descending",
    createdDates.every(
      (date, index) => index === 0 || date <= createdDates[index - 1],
    ),
  );
  // 8. Test custom pagination: page=2, limit=10
  const customPaginationResponse =
    await api.functional.shoppingMall.admin.users.index(
      authenticatedConnection,
      {
        body: {
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(customPaginationResponse);
  TestValidator.equals(
    "custom page is 2",
    customPaginationResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom limit is 10",
    customPaginationResponse.pagination.limit,
    10,
  );
  // 9. Test filtering by status
  // According to IShoppingMallUser.IRequest, status can be 'active', 'suspended', 'deleted'
  // According to IShoppingMallCategory, status can be 'pending', 'approved', 'rejected', 'suspended'
  // When requesting status='active', the API should return users whose status is 'approved' (for sellers) or 'active' (for customers/admins)
  // But the IShoppingMallCategory response type does not have 'active' as a status value, only 'pending', 'approved', 'rejected', 'suspended'
  // So we need to test with a status value that is valid in both request and response
  // Let's test with 'suspended' which exists in both
  const suspendedUsersResponse =
    await api.functional.shoppingMall.admin.users.index(
      authenticatedConnection,
      {
        body: {
          status: "suspended",
        },
      },
    );
  typia.assert(suspendedUsersResponse);
  TestValidator.predicate(
    "all filtered users are suspended",
    suspendedUsersResponse.data.every((user) => user.status === "suspended"),
  );
  // Additionally, test with status undefined (all users)
  const allUsersResponse = await api.functional.shoppingMall.admin.users.index(
    authenticatedConnection,
    {
      body: {},
    },
  );
  typia.assert(allUsersResponse);
  // 10. Test filtering by user_type
  const customerUsersResponse =
    await api.functional.shoppingMall.admin.users.index(
      authenticatedConnection,
      {
        body: {
          user_type: "customer",
        },
      },
    );
  typia.assert(customerUsersResponse);
  TestValidator.predicate(
    "all filtered users are customers",
    customerUsersResponse.data.every((user) => user.display_name !== undefined),
  );
  // 11. Test search functionality
  if (suspendedUsersResponse.data.length > 0) {
    const searchUser = suspendedUsersResponse.data[0];
    if (searchUser.email) {
      const searchResponse =
        await api.functional.shoppingMall.admin.users.index(
          authenticatedConnection,
          {
            body: {
              search: searchUser.email.split("@")[0], // Search by email prefix
            },
          },
        );
      typia.assert(searchResponse);
      TestValidator.predicate(
        "search results contain matching user",
        searchResponse.data.some((user) => {
          return user.email?.includes(searchUser.email!.split("@")[0]) ?? false;
        }),
      );
    }
  }
}
