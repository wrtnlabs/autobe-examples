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

export async function test_api_seller_suspension_retrieve_restored(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for suspension management
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create seller account to be suspended
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Create seller suspension record
  const suspension =
    await generate_random_ecommerce_mall_admin_seller_suspensions_create(
      adminConnection,
      {
        body: {
          seller_id: seller.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(suspension);
  // 4. Restore the suspended seller with reason
  const restoreReason = RandomGenerator.paragraph({ sentences: 2 });
  const restored =
    await api.functional.ecommerceMall.admin.seller_suspensions.restore(
      adminConnection,
      {
        suspensionId: suspension.id,
        body: {
          restored_reason: restoreReason,
        },
      },
    );
  typia.assert(restored);
  // 5. Retrieve the restored suspension details
  const retrieved =
    await api.functional.ecommerceMall.admin.seller_suspensions.at(
      adminConnection,
      {
        suspensionId: suspension.id,
      },
    );
  typia.assert(retrieved);
  // 6. Validate restored suspension details
  // restored_at should no longer be null
  TestValidator.predicate(
    "restored_at is no longer null",
    retrieved.restored_at !== null,
  );
  // restored_reason should match what was provided
  TestValidator.equals(
    "restored_reason matches",
    retrieved.restored_reason,
    restoreReason,
  );
  // restored_by should include the admin who lifted the suspension
  TestValidator.predicate(
    "restored_by admin is present",
    retrieved.restored_by !== null,
  );
  TestValidator.equals(
    "restored_by admin id matches",
    retrieved.restored_by!.id,
    restored.restored_by!.id,
  );
  // seller object should still show correct seller information
  TestValidator.equals("seller id matches", retrieved.seller.id, seller.id);
  TestValidator.equals(
    "seller email matches",
    retrieved.seller.email,
    seller.email,
  );
  // original suspended_at timestamp should be preserved
  TestValidator.equals(
    "suspended_at preserved",
    retrieved.suspended_at,
    suspension.suspended_at,
  );
  // original suspension reason should be preserved
  TestValidator.equals(
    "original reason preserved",
    retrieved.reason,
    suspension.reason,
  );
}
