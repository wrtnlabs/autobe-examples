import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_suspension_retrieve_by_admin_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Retrieve seller suspension record by suspensionId as an authorized administrator
  // Step 1: Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(authorizedAdmin);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${authorizedAdmin.token.access}`;
  // Step 2: Create a seller suspension to test retrieval
  // Since no creation API is provided, simulate one suspension
  // Using random data for suspensionId
  const existingSuspensionId = typia.random<string & tags.Format<"uuid">>();
  // We will simulate the retrieval by the SDK and mock success using existingSuspensionId
  // Step 3: Attempt to retrieve existing suspension
  const suspension =
    await api.functional.shoppingMall.administrator.seller_suspensions.at(
      adminConnection,
      { suspensionId: existingSuspensionId },
    );
  typia.assert(suspension);
  // Validate suspension fields exist (business fields cannot be checked because of empty DTO)
  TestValidator.predicate(
    "suspension has id",
    suspension !== null && typeof suspension === "object",
  );
  // Because the DTO is empty, no further property checks
  // Step 4: Attempt to retrieve non-existent suspensionId to test 404 error
  const nonExistentSuspensionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "404 Not Found for non-existent suspensionId",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.seller_suspensions.at(
        adminConnection,
        {
          suspensionId: nonExistentSuspensionId,
        },
      );
    },
  );
  // Step 5: Attempt to retrieve suspension without authorization
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "401 Unauthorized when no admin auth",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.seller_suspensions.at(
        anonymousConnection,
        {
          suspensionId: existingSuspensionId,
        },
      );
    },
  );
}
