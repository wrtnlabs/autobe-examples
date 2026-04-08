import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the business rule that requires administrators to provide a rejection reason when denying a seller application.
 *
 * This test validates that the seller rejection endpoint enforces the mandatory rejection reason requirement. When an administrator attempts to reject a pending seller application without providing a rejection reason, the system should reject the operation.
 *
 * 1. Register and authenticate an administrator account.
 * 2. Register and authenticate a seller account (defaults to 'pending' approval status).
 * 3. Verify seller is in pending status from the registration response.
 * 4. Attempt to reject the seller with null rejection reason.
 * 5. Verify that the rejection fails with an error.
 */
export async function test_api_seller_approval_rejection_requires_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: undefined,
  });
  typia.assert(adminAuth);
  // 2. Register and authenticate seller (will be in 'pending' status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: undefined,
  });
  typia.assert(sellerAuth);
  // 3. Verify seller is in pending status from registration response
  TestValidator.equals(
    "seller initial approval status is pending",
    sellerAuth.approval_status,
    "pending",
  );
  // 4. Attempt to reject seller with null rejection reason
  await TestValidator.error(
    "rejecting seller without reason should fail",
    async () => {
      await api.functional.shoppingMall.administrator.sellers.reject(
        adminConnection,
        {
          sellerId: sellerAuth.id,
          body: {
            rejectionReason: null,
          } satisfies IShoppingMallSeller.IReject,
        },
      );
    },
  );
}
