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

export async function test_api_seller_suspension_update_modify_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create seller suspension record
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const adminId = admin.id;
  const sellerSuspensionId = typia.random<string & tags.Format<"uuid">>();
  // Create initial suspension record
  const initialSuspension =
    await api.functional.ecommerceMall.admin.seller_suspensions.update(
      adminConnection,
      {
        sellerSuspensionId: sellerSuspensionId,
        body: {
          reason: "Initial reason",
          reinstated_at: null,
          reinstated_by_id: null,
        } satisfies IEcommerceMallSellerSuspension.IUpdate,
      },
    );
  typia.assert(initialSuspension);
  // 3. Update suspension reason only (no reinstatement)
  const updatedSuspension =
    await api.functional.ecommerceMall.admin.seller_suspensions.update(
      adminConnection,
      {
        sellerSuspensionId: sellerSuspensionId,
        body: {
          reason: "Updated reason - additional policy violation",
          reinstated_at: null,
          reinstated_by_id: null,
        } satisfies IEcommerceMallSellerSuspension.IUpdate,
      },
    );
  typia.assert(updatedSuspension);
  // 4. Validate response contains updated suspension record
  TestValidator.equals(
    "suspension ID matches",
    updatedSuspension.id,
    sellerSuspensionId,
  );
  TestValidator.equals(
    "seller ID matches",
    updatedSuspension.seller_id,
    sellerId,
  );
  TestValidator.equals("admin ID matches", updatedSuspension.admin_id, adminId);
  // 5. Verify reason field is updated with new value
  TestValidator.equals(
    "reason updated",
    updatedSuspension.reason,
    "Updated reason - additional policy violation",
  );
  // 6. Verify reinstated_at and reinstated_by_id remain null
  TestValidator.equals(
    "reinstated_at is null",
    updatedSuspension.reinstated_at,
    null,
  );
  TestValidator.equals(
    "reinstated_by_id is null",
    updatedSuspension.reinstated_by_id,
    null,
  );
  // 7. Verify seller remains suspended (products still hidden) - assuming this is part of the suspension state
  TestValidator.equals(
    "seller is still suspended",
    updatedSuspension.seller.is_suspended,
    true,
  );
}
