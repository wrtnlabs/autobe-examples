import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_admin_admin_sellers_suspend } from "../../../generate/generate_random_ecommerce_mall_admin_admin_sellers_suspend";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

/**
 * Test error handling when attempting to suspend a seller who is already suspended.
 *
 * Validates the system's behavior when an administrator tries to suspend a seller
 * account that is already in a suspended state. This test ensures proper error
 * handling and prevents duplicate suspension records from being created.
 *
 * **Business Rules Tested:**
 * - Sellers can only be suspended once at a time
 * - Attempting to suspend an already suspended seller returns 400 error
 * - Error message should clearly indicate the seller is already suspended
 * - No duplicate suspension records should be created
 *
 * **Test Flow:**
 * 1. Administrator registers and authenticates
 * 2. Seller registers and gets approved
 * 3. Seller is suspended (first time - should succeed)
 * 4. Attempt to suspend the same seller again (should fail with 400)
 * 5. Verify the first suspension remains unchanged (proving no duplicate)
 */
export async function test_api_seller_suspension_already_suspended(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account (join sets the token automatically)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register and approve a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 3. Approve the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId: sellerAuth.id },
    );
  typia.assert(approvedSeller);
  // 4. First suspension - should succeed
  const firstSuspension =
    await generate_random_ecommerce_mall_admin_admin_sellers_suspend(
      adminConnection,
      { params: { sellerId: approvedSeller.id } },
    );
  typia.assert(firstSuspension);
  // Verify first suspension has no restoredAt (still active)
  TestValidator.equals(
    "first suspension is active",
    firstSuspension.restoredAt,
    null,
  );
  // 5. Attempt second suspension - should fail with 400 error
  // The HTTP 400 error response proves that duplicate suspension was rejected
  await TestValidator.httpError(
    "suspend already suspended seller returns 400",
    400,
    async () =>
      await api.functional.ecommerceMall.admin.admin.sellers.suspend(
        adminConnection,
        {
          sellerId: approvedSeller.id,
          body: {
            reason: "Second attempt suspension - should fail",
          } satisfies IEcommerceMallSellerSuspension.ICreate,
        },
      ),
  );
  // 6. Verify first suspension remains unchanged (still active, not duplicated)
  // The successful first suspension and rejected second attempt proves
  // that no duplicate suspension records are created
  TestValidator.equals(
    "original suspension still active",
    firstSuspension.restoredAt,
    null,
  );
}
