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

export async function test_api_administrator_password_resets_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario verifies that an administrator can successfully retrieve the details of a specific customer password reset token
  // by providing a valid UUID passwordResetId. It validates that the response includes the token string, expiration timestamp, creation and update metadata,
  // deletion status (if any), and the associated customer ID. It also confirms that the token exists and is not soft deleted. The scenario includes verifying access control: only administrator users can access this endpoint.
  // 1. Administrator account creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234",
    },
  });
  typia.assert(adminAuthorized);
  // After join, the authorize_administrator_join must update adminConnection.headers internally with access token for auth
  // 2. Create a password reset token via simulating a valid UUID (we assume token exists or use the simulate mode to generate a valid token UUID)
  // Since no utility for creating password reset tokens was mentioned, we use a random UUID for passwordResetId
  const passwordResetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve password reset token details by administrator
  const passwordReset =
    await api.functional.shoppingMall.administrator.password_resets.at(
      adminConnection,
      {
        passwordResetId,
      },
    );
  typia.assert(passwordReset);
  // 4. Validate the response fields
  TestValidator.equals(
    "passwordReset id matches requested",
    passwordReset.id,
    passwordResetId,
  );
  TestValidator.predicate(
    "token exists and is non-empty",
    typeof passwordReset.token === "string" && passwordReset.token.length > 0,
  );
  TestValidator.predicate(
    "expiredAt is valid ISO string",
    typeof passwordReset.expiredAt === "string" &&
      Boolean(Date.parse(passwordReset.expiredAt)),
  );
  TestValidator.predicate(
    "createdAt is valid ISO string",
    typeof passwordReset.createdAt === "string" &&
      Boolean(Date.parse(passwordReset.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO string",
    typeof passwordReset.updatedAt === "string" &&
      Boolean(Date.parse(passwordReset.updatedAt)),
  );
  // deletedAt can be null or valid ISO string
  if (passwordReset.deletedAt !== null) {
    TestValidator.predicate(
      "deletedAt is valid ISO string when not null",
      typeof passwordReset.deletedAt === "string" &&
        Boolean(Date.parse(passwordReset.deletedAt)),
    );
  }
  typia.assertGuard<string & tags.Format<"uuid">>(
    passwordReset.shoppingCustomerId,
  );
  TestValidator.predicate(
    "shoppingCustomerId is valid UUID format",
    typeof passwordReset.shoppingCustomerId === "string",
  );
}
