import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAccessLog";
import type { IShoppingMallAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccessLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_access_logs_integrity(
  connection: api.IConnection,
) {
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminFirstName: string = RandomGenerator.name();
  const adminLastName: string = RandomGenerator.name();
  const adminRole: "super_admin" | "full_admin" | "limited_admin" =
    "full_admin";

  // Create admin account
  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: adminFirstName,
        last_name: adminLastName,
        role: adminRole,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Authenticate admin to trigger login event
  const authenticatedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(authenticatedAdmin);

  // Verify that admin identity is preserved across authentication
  TestValidator.equals(
    "admin identity is preserved across login",
    createdAdmin.id,
    authenticatedAdmin.id,
  );

  // Retrieve access logs
  const logs: IPageIShoppingMallAccessLog =
    await api.functional.shoppingMall.admin.access.logs.index(connection);
  typia.assert(logs);

  // Validate at least one log entry exists (login event)
  TestValidator.predicate(
    "at least one access log exists",
    () => logs.data.length >= 1,
  );

  // Validate all logs are non-empty strings
  TestValidator.predicate(
    "all access logs are valid strings",
    () =>
      logs.data.length > 0 &&
      logs.data.every((log) => typeof log === "string" && log.length > 0),
  );
}
