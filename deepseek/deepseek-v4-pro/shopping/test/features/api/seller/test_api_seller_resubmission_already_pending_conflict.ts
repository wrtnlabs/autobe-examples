import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that pending sellers cannot resubmit their registration.
 *
 * Validates the gatekeeping precondition that prevents sellers with "pending"
 * approval status from calling the resubmission endpoint. Only sellers whose
 * registration was previously rejected may resubmit — pending sellers must
 * wait for administrator review.
 *
 * 1. A new seller registers via authorize_seller_join, starting in "pending" status.
 * 2. Verify the initial approval_status is "pending".
 * 3. Attempt to call the resubmission endpoint as the pending seller.
 * 4. Expect HTTP 409 Conflict indicating the registration is already awaiting review.
 */
export async function test_api_seller_resubmission_already_pending_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Register a new seller - they start as "pending"
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(authorized);
  // Verify initial state is pending
  TestValidator.equals(
    "initial approval_status",
    authorized.approval_status,
    "pending",
  );
  // Attempt resubmission - should fail with 409 Conflict
  await TestValidator.httpError(
    "pending seller cannot resubmit",
    409,
    async () => {
      await api.functional.shoppingMall.seller.resubmission.resubmit(
        sellerConnection,
      );
    },
  );
}
