import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequestSnapshot";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test that a customer cannot retrieve snapshots of another customer's administrator promotion request.
 *
 * This test validates access control enforcement for admin promotion request snapshots:
 * 1. Customer A registers and submits an admin promotion request
 * 2. Super administrator approves the request (creating a snapshot)
 * 3. Customer A retrieves their snapshot list to get the snapshot ID
 * 4. Customer B registers and attempts to access Customer A's snapshot
 * 5. Verify Customer B receives HTTP 403 Forbidden
 */
export async function test_api_admin_promotion_request_snapshot_access_control_submitter_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {});
  typia.assert(customerAAuth);
  // 2. Customer A submits admin promotion request
  const promotionRequest =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customerAConnection,
      {},
    );
  typia.assert(promotionRequest);
  // 3. Register super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuth);
  // 4. Super administrator approves Customer A's request (creates snapshot)
  const approvedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.approve(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(approvedRequest);
  // 5. Customer A retrieves snapshot list to get snapshot ID
  const snapshotList =
    await api.functional.shoppingMall.customer.admin_promotion_requests.snapshots.index(
      customerAConnection,
      {
        requestId: promotionRequest.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(snapshotList);
  // Verify snapshot list has at least one snapshot
  TestValidator.predicate(
    "snapshot list not empty",
    () => snapshotList.data.length > 0,
  );
  const snapshotId = snapshotList.data[0]!.id;
  // 6. Register Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {});
  typia.assert(customerBAuth);
  // 7. Customer B attempts to access Customer A's snapshot - should fail with 403
  await TestValidator.error(
    "Customer B cannot access Customer A's snapshot",
    async () => {
      await api.functional.shoppingMall.customer.admin_promotion_requests.snapshots.at(
        customerBConnection,
        {
          requestId: promotionRequest.id,
          snapshotId: snapshotId,
        },
      );
    },
  );
}
