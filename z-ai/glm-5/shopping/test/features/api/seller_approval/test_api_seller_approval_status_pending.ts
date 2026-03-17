import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a newly registered seller can view their pending approval status.
 * After registration, seller accounts have approval_status='pending' and rejection_reason=null.
 */
export async function test_api_seller_approval_status_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection and register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Call the approval status endpoint
  const status =
    await api.functional.shoppingMall.seller.sellers.approval_status.get(
      sellerConnection,
    );
  typia.assert(status);
  // 3. Validate the response - approvalStatus should be 'pending' and rejectionReason should be null
  TestValidator.equals(
    "approvalStatus is pending",
    status.approvalStatus,
    "pending",
  );
  TestValidator.equals("rejectionReason is null", status.rejectionReason, null);
}
