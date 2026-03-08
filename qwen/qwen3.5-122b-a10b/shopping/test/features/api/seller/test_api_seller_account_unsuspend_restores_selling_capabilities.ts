import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_account_unsuspend_restores_selling_capabilities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.assert<IEcommerceMallAdmin.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    }),
  });
  typia.assert(adminAuth);
  // 2. Generate a seller ID for testing
  // Note: In simulation mode, any valid UUID will be accepted
  // In production, this seller would need to exist and be suspended first
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Suspend the seller account (prerequisite for unsuspension)
  const suspendedSeller =
    await api.functional.ecommerceMall.admin.sellers.suspend(adminConnection, {
      sellerId,
    });
  typia.assert(suspendedSeller);
  TestValidator.equals(
    "seller suspended successfully",
    suspendedSeller.account_status,
    "suspended",
  );
  // 4. Unsuspend the seller account
  const unsuspendedSeller =
    await api.functional.ecommerceMall.admin.sellers.unsuspend(
      adminConnection,
      {
        sellerId,
      },
    );
  typia.assert(unsuspendedSeller);
  // 5. Verify account_status changed from 'suspended' to 'active'
  TestValidator.equals(
    "account_status restored to active",
    unsuspendedSeller.account_status,
    "active",
  );
  TestValidator.notEquals(
    "status changed from suspended",
    unsuspendedSeller.account_status,
    suspendedSeller.account_status,
  );
  // 6. Verify the seller entity structure is valid
  TestValidator.predicate(
    "seller has valid ID",
    unsuspendedSeller.id !== undefined && unsuspendedSeller.id !== null,
  );
  TestValidator.predicate(
    "seller has shop name",
    unsuspendedSeller.shop_name !== undefined &&
      unsuspendedSeller.shop_name !== null,
  );
  TestValidator.predicate(
    "seller has approval status",
    unsuspendedSeller.approval_status !== undefined &&
      unsuspendedSeller.approval_status !== null,
  );
  TestValidator.predicate(
    "seller has timestamps",
    unsuspendedSeller.created_at !== undefined &&
      unsuspendedSeller.updated_at !== undefined,
  );
  // Note: Full workflow verification (snapshot creation, product visibility, product CRUD)
  // requires seller creation and product management APIs that are not currently available
  // in the provided SDK functions. The test validates the core unsuspend operation
  // and account_status restoration, which are the primary responsibilities of this endpoint.
}