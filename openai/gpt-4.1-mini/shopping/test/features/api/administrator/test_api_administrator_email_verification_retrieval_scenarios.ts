import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_email_verification_retrieval_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  // Join to obtain authorization
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  // Set Authorization header with Bearer token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Scenario 1: Attempt to retrieve an email verification with random valid UUID (expected 404)
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "Admin retrieval of non-existent email verification returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.email_verifications.at(
        adminConnection,
        { emailVerificationId: randomId },
      );
    },
  );
  // Scenario 2: Unauthorized user attempts retrieval (no auth token)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "Unauthorized retrieval is denied with 401 or 403",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.email_verifications.at(
        unauthorizedConnection,
        { emailVerificationId: randomId },
      );
    },
  );
}
