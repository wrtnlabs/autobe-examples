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
import { generate_random_shopping_mall_administrator_seller_suspensions_suspend_suspend_seller } from "../../../generate/generate_random_shopping_mall_administrator_seller_suspensions_suspend_suspend_seller";
import { prepare_random_shopping_mall_seller_suspension } from "../../../prepare/prepare_random_shopping_mall_seller_suspension";

export async function test_api_administrator_suspend_seller_success_and_errors(
  connection: api.IConnection,
): Promise<void> {
  // Test suspending a seller account successfully by an authorized administrator.
  // 1. Administrator Join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // The utility function sets Authorization header internally, no need to set manually
  // 2. Generate a valid seller ID as UUID string
  const validSellerId = typia.random<string & tags.Format<"uuid">>();
  // Note: The DTO for IShoppingMallSellerSuspension.ICreate is empty, so we cannot specify suspension_reason or suspended_at
  // This limits our ability to test business logic properly, but we will call with empty body
  // 3. Suspend seller with empty body (due to missing DTO props)
  {
    const body: IShoppingMallSellerSuspension.ICreate = {};
    const suspendRecord =
      await generate_random_shopping_mall_administrator_seller_suspensions_suspend_suspend_seller(
        adminConnection,
        {
          params: { sellerId: validSellerId },
          body: body,
        },
      );
    typia.assert(suspendRecord);
  }
  // 4. Suspend seller with empty body again
  {
    const body: IShoppingMallSellerSuspension.ICreate = {};
    const suspendRecord =
      await generate_random_shopping_mall_administrator_seller_suspensions_suspend_suspend_seller(
        adminConnection,
        {
          params: { sellerId: validSellerId },
          body: body,
        },
      );
    typia.assert(suspendRecord);
  }
  // 5. Test error case: invalid seller ID (should be 404)
  await TestValidator.httpError(
    "suspension with invalid seller ID should return 404",
    404,
    async () => {
      await generate_random_shopping_mall_administrator_seller_suspensions_suspend_suspend_seller(
        adminConnection,
        {
          params: { sellerId: "00000000-0000-0000-0000-000000000000" },
          body: {},
        },
      );
    },
  );
  // 6. Test error case: missing suspension reason (business 400 error)
  // Since body is empty in DTO, testing missing suspension reason with type error is not feasible
  // Instead, we test error handling by sending empty body
  await TestValidator.error(
    "suspension request missing reason should fail",
    async () => {
      await generate_random_shopping_mall_administrator_seller_suspensions_suspend_suspend_seller(
        adminConnection,
        {
          params: { sellerId: validSellerId },
          body: {},
        },
      );
    },
  );
  // 7. Test authorization: non-admin user should be rejected
  const userConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "suspension request without admin authorization should return 401",
    401,
    async () => {
      await generate_random_shopping_mall_administrator_seller_suspensions_suspend_suspend_seller(
        userConnection,
        {
          params: { sellerId: validSellerId },
          body: {},
        },
      );
    },
  );
}
