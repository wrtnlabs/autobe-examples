import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an administrator can filter request snapshots by status transition (approved vs rejected responses).
 *
 * Validates the filtering capability of the request snapshots endpoint by testing status_after parameter with both 'approved' and 'rejected' values. Ensures that all returned snapshots correctly reflect the requested status transition and contain complete related entity information.
 *
 * Special attention is given to verifying that status_before is always 'pending' for all snapshots, and that seller_reason is populated appropriately for both approved and rejected responses.
 *
 * 1. Authenticate as administrator using join endpoint.
 * 2. Call request-snapshots endpoint with status_after='approved' filter.
 * 3. Verify all returned snapshots have status_after='approved' and status_before='pending'.
 * 4. Verify seller_reason field is populated for approved requests.
 * 5. Call request-snapshots endpoint with status_after='rejected' filter.
 * 6. Verify all returned snapshots have status_after='rejected' and status_before='pending'.
 * 7. Verify seller_reason field contains rejection explanation for rejected requests.
 */
export async function test_api_request_snapshots_filter_by_status_transition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // 2. Filter by status_after='approved'
  const approvedResponse =
    await api.functional.shoppingMall.administrator.request_snapshots.index(
      adminConnection,
      {
        body: {
          status_after: "approved",
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedResponse);
  // 3. Verify all approved snapshots have correct status transition
  for (const snapshot of approvedResponse.data) {
    TestValidator.equals(
      "approved snapshot status_after",
      snapshot.status_after,
      "approved",
    );
    TestValidator.equals(
      "approved snapshot status_before",
      snapshot.status_before,
      "pending",
    );
    TestValidator.predicate(
      "approved snapshot has seller_reason",
      snapshot.seller_reason !== null,
    );
  }
  // 5. Filter by status_after='rejected'
  const rejectedResponse =
    await api.functional.shoppingMall.administrator.request_snapshots.index(
      adminConnection,
      {
        body: {
          status_after: "rejected",
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedResponse);
  // 6. Verify all rejected snapshots have correct status transition
  for (const snapshot of rejectedResponse.data) {
    TestValidator.equals(
      "rejected snapshot status_after",
      snapshot.status_after,
      "rejected",
    );
    TestValidator.equals(
      "rejected snapshot status_before",
      snapshot.status_before,
      "pending",
    );
    TestValidator.predicate(
      "rejected snapshot has seller_reason",
      snapshot.seller_reason !== null,
    );
  }
}
