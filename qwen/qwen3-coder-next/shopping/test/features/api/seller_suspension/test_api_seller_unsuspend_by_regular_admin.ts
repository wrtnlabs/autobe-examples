import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_admin_seller_suspensions_suspend } from "../../../generate/generate_random_ecommerce_mall_admin_seller_suspensions_suspend";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_unsuspend_by_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin with regular grade
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create seller suspension record by admin
  const sellerSuspension =
    await api.functional.ecommerceMall.admin.seller_suspensions.suspend(
      adminConnection,
      {
        body: {
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(sellerSuspension);
  // Verify suspension record was created with expected properties
  TestValidator.predicate(
    "suspension has valid ID",
    () => sellerSuspension.id !== undefined,
  );
  // 3. Unsuspend the seller using the suspension ID
  const result =
    await api.functional.ecommerceMall.admin.seller_suspensions.unsuspend(
      adminConnection,
      {
        sellerSuspensionId: sellerSuspension.id,
        body: {} satisfies IEcommerceMallSellerSuspension.IUnsuspend,
      },
    );
  typia.assert(result);
  // 4. Validate unsuspension result
  TestValidator.equals("suspension ID matches", result.id, sellerSuspension.id);
  TestValidator.predicate(
    "reinstated_at is set",
    () => result.reinstated_at !== null && result.reinstated_at !== undefined,
  );
  TestValidator.equals(
    "reinstated_by_id matches admin ID",
    result.reinstated_by_id,
    admin.id,
  );
}
