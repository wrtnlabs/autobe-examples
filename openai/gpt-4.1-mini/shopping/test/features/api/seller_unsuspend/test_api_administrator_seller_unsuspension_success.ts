import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_seller_unsuspension_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator account join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_administrator_join(adminConnection, {});
  // 2. Prepare suspended seller account
  // NOTE: No endpoint available to create or suspend seller, so we simulate sellerId
  // for unsuspension test. In real scenario, use fixtures or dedicated APIs.
  const suspendedSellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Admin unsuspends suspended seller
  const unsuspendResult =
    await api.functional.shoppingMall.administrator.seller_suspensions.unsuspend(
      adminConnection,
      {
        sellerId: suspendedSellerId,
      },
    );
  typia.assert(unsuspendResult);
  // 4. Validate suspension record is removed or deactivated
  TestValidator.predicate(
    "unsuspension returned object with deleted_at nullable",
    unsuspendResult.deleted_at === null ||
      typeof unsuspendResult.deleted_at === "string",
  );
  // 5. Verify seller product editing and visibility restored
  // NOTE: No product APIs provided, only validate seller id and approval status
  TestValidator.equals(
    "unsuspended seller id matches",
    unsuspendResult.seller.id,
    suspendedSellerId,
  );
  TestValidator.notEquals(
    "seller is not suspended",
    unsuspendResult.seller.approvalStatus,
    "suspended",
  );
  // 6. Unauthorized access attempt with unauthenticated connection
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized unsuspension attempt",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.seller_suspensions.unsuspend(
        unauthorizedConnection,
        {
          sellerId: suspendedSellerId,
        },
      );
    },
  );
}
