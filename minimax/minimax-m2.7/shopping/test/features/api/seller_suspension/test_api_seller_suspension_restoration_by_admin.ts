import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_admin_seller_suspensions_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_suspensions_create";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_suspension_restoration_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Register a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Create a seller suspension record via POST /admin/seller-suspensions
  const suspension =
    await generate_random_ecommerce_mall_admin_seller_suspensions_create(
      adminConnection,
      {
        body: {
          seller_id: sellerAuth.id,
          reason: "Policy violation - test suspension",
        },
      },
    );
  typia.assert(suspension);
  // Verify suspension is active (restored_at is null)
  TestValidator.equals("suspension is active", suspension.restored_at, null);
  TestValidator.equals(
    "suspension reason matches",
    suspension.reason,
    "Policy violation - test suspension",
  );
  TestValidator.equals(
    "suspended seller id matches",
    suspension.seller.id,
    sellerAuth.id,
  );
  // 4. Restore the suspension via PUT /admin/seller-suspensions/{suspensionId}
  const restoredSuspension =
    await api.functional.ecommerceMall.admin.seller_suspensions.restore(
      adminConnection,
      {
        suspensionId: suspension.id,
        body: {
          restored_reason: "Seller has addressed policy concerns",
        } satisfies IEcommerceMallSellerSuspension.IUpdate,
      },
    );
  typia.assert(restoredSuspension);
  // 5. Validate restored suspension
  TestValidator.equals(
    "suspension id preserved",
    restoredSuspension.id,
    suspension.id,
  );
  TestValidator.equals(
    "suspension reason preserved",
    restoredSuspension.reason,
    suspension.reason,
  );
  TestValidator.equals(
    "suspended seller preserved",
    restoredSuspension.seller.id,
    sellerAuth.id,
  );
  TestValidator.predicate(
    "restored_at is set",
    restoredSuspension.restored_at !== null &&
      restoredSuspension.restored_at !== undefined,
  );
  TestValidator.equals(
    "restored_reason matches",
    restoredSuspension.restored_reason,
    "Seller has addressed policy concerns",
  );
  TestValidator.predicate(
    "restored_by is set",
    restoredSuspension.restored_by !== null &&
      restoredSuspension.restored_by !== undefined,
  );
  TestValidator.equals(
    "restored_by id matches admin",
    restoredSuspension.restored_by!.id,
    adminAuth.id,
  );
}
