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
 * Test unsuspending a suspended seller without providing a restoration reason.
 *
 * Validates the seller unsuspension flow when an administrator restores a suspended
 * seller account without specifying why the suspension was lifted. This test ensures
 * that the unsuspension operation succeeds even with an empty request body, and that
 * the audit trail correctly records the restoration with a null reason field.
 *
 * 1. Administrator registers and authenticates on the platform.
 * 2. New seller registers and authenticates to create a test seller account.
 * 3. Admin suspends the seller with a suspension reason for testing purposes.
 * 4. Verify seller suspension record has null restored_at (active suspension).
 * 5. Admin unsuspends the seller with an empty/null request body.
 * 6. Validate response contains the updated seller with suspension restored.
 * 7. Confirm restored_at timestamp is now populated.
 * 8. Confirm restored_reason remains null as no reason was provided.
 * 9. Verify the suspension audit trail captures the restoring admin's identity.
 */
export async function test_api_seller_unsuspend_without_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Admin suspends the seller with a test reason
  const suspension =
    await api.functional.ecommerceMall.admin.admin.sellers.suspend(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          reason: "Test suspension",
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspension);
  // 4. Verify seller is currently suspended (restored_at is null)
  TestValidator.equals(
    "suspension restored_at is null",
    suspension.restoredAt,
    null,
  );
  TestValidator.equals(
    "suspension reason matches",
    suspension.reason,
    "Test suspension",
  );
  // 5. Unsuspend the seller with empty/null request body (no restoredReason)
  const unsuspended =
    await api.functional.ecommerceMall.admin.admin.sellers.unsuspend(
      adminConnection,
      {
        sellerId: seller.id,
        body: {} satisfies IEcommerceMallSeller.IUnsuspend,
      },
    );
  typia.assert(unsuspended);
  // 6. Validate response returns 200 with seller record updated
  TestValidator.equals("seller id matches", unsuspended.id, seller.id);
  TestValidator.equals("seller email matches", unsuspended.email, seller.email);
  // 7. Confirm restored_at timestamp is populated in the suspension audit trail
  const latestSuspension =
    unsuspended.sellerSuspensions[unsuspended.sellerSuspensions.length - 1];
  TestValidator.predicate(
    "restored_at is populated",
    latestSuspension.restored_at !== null,
  );
  // 8. Confirm restored_reason is null (no reason was provided)
  TestValidator.equals(
    "restored_reason is null",
    latestSuspension.restored_reason,
    null,
  );
  // 9. Verify the suspension audit trail records the admin who performed unsuspension
  TestValidator.predicate(
    "restoredBy admin is present",
    latestSuspension.restoredBy !== null,
  );
  TestValidator.equals(
    "restoredBy admin id matches",
    latestSuspension.restoredBy!.id,
    admin.id,
  );
}
