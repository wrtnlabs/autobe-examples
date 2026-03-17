import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import type { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_customer_admin_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_admin_request_list_filtered_by_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register first customer and submit a pending admin request
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {});
  const pendingRequest =
    await generate_random_shopping_mall_customer_admin_requests_create(
      customer1Connection,
      {},
    );
  typia.assert(pendingRequest);
  // 3. Register second customer and submit an admin request
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {});
  const toApproveRequest =
    await generate_random_shopping_mall_customer_admin_requests_create(
      customer2Connection,
      {},
    );
  typia.assert(toApproveRequest);
  // 4. Super admin approves the second customer's request
  const approvedRequest =
    await api.functional.shoppingMall.superAdmin.adminRequests.review(
      superAdminConnection,
      {
        requestId: toApproveRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IReview,
      },
    );
  typia.assert(approvedRequest);
  // 5. Filter by "pending" — only first request should appear
  const pendingPage =
    await api.functional.shoppingMall.superAdmin.adminRequests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingPage);
  // All returned items must have status "pending"
  TestValidator.predicate(
    "all pending-filtered results have status pending",
    () => pendingPage.data.every((item) => item.status === "pending"),
  );
  // The approved request must NOT appear in pending results
  TestValidator.predicate("approved request not in pending results", () =>
    pendingPage.data.every((item) => item.id !== toApproveRequest.id),
  );
  // The pending request MUST appear in pending results
  TestValidator.predicate("pending request is in pending results", () =>
    pendingPage.data.some((item) => item.id === pendingRequest.id),
  );
  // 6. Filter by "approved" — only second (approved) request should appear
  const approvedPage =
    await api.functional.shoppingMall.superAdmin.adminRequests.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedPage);
  // All returned items must have status "approved"
  TestValidator.predicate(
    "all approved-filtered results have status approved",
    () => approvedPage.data.every((item) => item.status === "approved"),
  );
  // The pending request must NOT appear in approved results
  TestValidator.predicate("pending request not in approved results", () =>
    approvedPage.data.every((item) => item.id !== pendingRequest.id),
  );
  // The approved request MUST appear in approved results
  TestValidator.predicate("approved request is in approved results", () =>
    approvedPage.data.some((item) => item.id === toApproveRequest.id),
  );
  // 7. No status filter — both requests should appear
  const allPage =
    await api.functional.shoppingMall.superAdmin.adminRequests.index(
      superAdminConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(allPage);
  TestValidator.predicate(
    "no-filter results contain at least 2 records",
    () => allPage.pagination.records >= 2,
  );
  TestValidator.predicate("pending request appears in unfiltered results", () =>
    allPage.data.some((item) => item.id === pendingRequest.id),
  );
  TestValidator.predicate(
    "approved request appears in unfiltered results",
    () => allPage.data.some((item) => item.id === toApproveRequest.id),
  );
}
