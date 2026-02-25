import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the idempotent behavior of the suspend endpoint when attempting to suspend
 * an already-suspended seller. According to the specification, suspending an
 * already-suspended seller should return the current state without causing an error.
 *
 * Workflow:
 * 1. Admin joins and receives authentication tokens
 * 2. A seller registers (status is 'pending')
 * 3. Admin approves the seller (status becomes 'approved')
 * 4. Admin suspends the seller for the first time (status becomes 'suspended')
 * 5. Admin calls suspend on the same seller again (idempotent call)
 *
 * Validation points:
 * - First suspension should succeed with status 'suspended'
 * - Second suspension (idempotent call) should return HTTP 200 OK
 * - Response should contain the seller with approvalStatus = 'suspended'
 * - No error should be thrown for the duplicate suspension attempt
 * - All seller properties should remain consistent between both responses
 */
export async function test_api_seller_suspension_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registers (status is 'pending')
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approved",
    approvedSeller.approvalStatus,
    "approved",
  );
  // 4. Admin suspends the seller for the first time
  const firstSuspensionResult =
    await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(firstSuspensionResult);
  TestValidator.equals(
    "first suspension status",
    firstSuspensionResult.approvalStatus,
    "suspended",
  );
  // 5. Admin calls suspend on the same seller again (idempotent call)
  const secondSuspensionResult =
    await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(secondSuspensionResult);
  // Validate idempotent behavior
  TestValidator.equals(
    "second suspension returns suspended status",
    secondSuspensionResult.approvalStatus,
    "suspended",
  );
  TestValidator.equals(
    "seller id remains same",
    secondSuspensionResult.id,
    firstSuspensionResult.id,
  );
  TestValidator.equals(
    "seller email remains same",
    secondSuspensionResult.email,
    firstSuspensionResult.email,
  );
}
