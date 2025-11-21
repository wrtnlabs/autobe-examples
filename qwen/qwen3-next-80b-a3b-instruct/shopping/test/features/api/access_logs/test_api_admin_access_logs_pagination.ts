import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAccessLog";
import type { IShoppingMallAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccessLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_access_logs_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Authenticate admin to access logs endpoint
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password_hash: "securePassword123",
    } satisfies IShoppingMallAdmin.IRequest,
  });

  // Step 3: Get access logs (with default pagination)
  const response: IPageIShoppingMallAccessLog =
    await api.functional.shoppingMall.admin.access.logs.index(connection);
  typia.assert(response);

  // Step 4: Validate Pagination Structure (conforms to IPage.IPagination)
  const pagination = response.pagination;
  TestValidator.equals(
    "current page is positive integer",
    pagination.current,
    pagination.current satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "limit is positive integer",
    pagination.limit,
    pagination.limit satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "records is positive integer",
    pagination.records,
    pagination.records satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "pages is positive integer",
    pagination.pages,
    pagination.pages satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  // Step 5: Validate data structure - IShoppingMallAccessLog is a string
  TestValidator.predicate("data array is not empty", response.data.length > 0);

  // Each item in data array must be a string (IShoppingMallAccessLog)
  response.data.forEach((log, index) => {
    TestValidator.predicate(
      `log entry ${index} is a non-empty string`,
      typeof log === "string" && log.length > 0,
    );
  });

  // Step 6: Confirm overall response shape
  TestValidator.equals(
    "total records matches data array length",
    pagination.records,
    response.data.length,
  );
}
