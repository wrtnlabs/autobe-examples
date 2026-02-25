import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test behavior when an authenticated administrator attempts to retrieve a system version using a non-existent UUID.
 * Validate that the response returns the appropriate 'not found' error (e.g., HTTP 404).
 * Ensure that authorization is enforced and only administrators can access this endpoint.
 */
export async function test_api_system_version_retrieve_not_found_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate using join utility
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // Use a valid random UUID that does not exist on systemVersions
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve system version with non-existent ID
  await TestValidator.httpError(
    "administrator attempts to retrieve non-existent system version",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.systemVersions.at(
        adminConnection,
        { id: nonExistentId },
      );
    },
  );
}
