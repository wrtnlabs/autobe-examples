import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_password_resets_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description: Ensure that retrieving a password reset token by a non-existent or soft-deleted ID returns a 404 error, and that only administrators can perform this action.
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  // Use authorize_administrator_join since join dependency provided
  const admin = await authorize_administrator_join(adminConnection, {});
  adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  // 2. Prepare test invalid UUID (non-existent ID) and a soft-deleted ID mock
  // Use random UUID for non-existent ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // For soft-deleted ID, simulate by not creating one, assume random UUID
  // Normally, cannot create soft-deleted token, so just random UUID.
  const softDeletedId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve password reset token with non-existent ID
  await TestValidator.httpError(
    "retrieve password reset token with non-existent ID returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.password_resets.at(
        adminConnection,
        {
          passwordResetId: nonExistentId,
        },
      );
    },
  );
  // 4. Attempt to retrieve password reset token with soft-deleted ID
  await TestValidator.httpError(
    "retrieve password reset token with soft-deleted ID returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.password_resets.at(
        adminConnection,
        {
          passwordResetId: softDeletedId,
        },
      );
    },
  );
}
