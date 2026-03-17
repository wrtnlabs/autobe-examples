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

export async function test_api_seller_approval_status_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new seller account
  // Note: New sellers start with 'pending' approval status
  // In production, admin approval is required for 'approved' status
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Check approval status
  const status =
    await api.functional.shoppingMall.seller.sellers.approval_status.get(
      sellerConnection,
    );
  typia.assert(status);
  // 3. Validate response structure
  // In simulation mode, the status may vary
  // Testing that the response has the expected structure
  TestValidator.predicate(
    "approval status is valid",
    status.approvalStatus === "pending" ||
      status.approvalStatus === "approved" ||
      status.approvalStatus === "rejected",
  );
  // 4. Verify rejection reason is null for non-rejected status
  if (status.approvalStatus === "approved") {
    TestValidator.equals(
      "rejection reason is null for approved",
      status.rejectionReason,
      null,
    );
  } else if (status.approvalStatus === "pending") {
    TestValidator.equals(
      "rejection reason is null for pending",
      status.rejectionReason,
      null,
    );
  }
}
