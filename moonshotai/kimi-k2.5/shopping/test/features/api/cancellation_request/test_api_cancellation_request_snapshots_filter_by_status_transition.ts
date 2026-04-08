import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

export async function test_api_cancellation_request_snapshots_filter_by_status_transition(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection using join utility (creates and authenticates admin)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Setup customer connection (creates and authenticates customer)
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Create multiple cancellation requests (simulated backend generates snapshots with various status transitions)
  const cancellationRequest1 =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  const cancellationRequest2 =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  const cancellationRequest3 =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  typia.assert(cancellationRequest1);
  typia.assert(cancellationRequest2);
  typia.assert(cancellationRequest3);
  // Test (a): Filter by statusBefore="pending" returns only snapshots where request was initially pending
  const pendingBeforeResult =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest1.id,
        body: {
          page: 1,
          limit: 20,
          createdAtFrom: null,
          createdAtTo: null,
          statusBefore: "pending",
          statusAfter: null,
          sortField: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(pendingBeforeResult);
  // Validate all results have statusBefore="pending"
  for (const snapshot of pendingBeforeResult.data) {
    TestValidator.equals(
      "statusBefore should be pending",
      snapshot.statusBefore,
      "pending",
    );
  }
  // Test (b): Filter by statusAfter="approved" returns only approved transitions
  const approvedAfterResult =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest2.id,
        body: {
          page: 1,
          limit: 20,
          createdAtFrom: null,
          createdAtTo: null,
          statusBefore: null,
          statusAfter: "approved",
          sortField: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedAfterResult);
  // Validate all results have statusAfter="approved"
  for (const snapshot of approvedAfterResult.data) {
    TestValidator.equals(
      "statusAfter should be approved",
      snapshot.statusAfter,
      "approved",
    );
  }
  // Test (c): Combining statusBefore and statusAfter filters works correctly (pending→approved)
  const combinedFilterResult =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest3.id,
        body: {
          page: 1,
          limit: 20,
          createdAtFrom: null,
          createdAtTo: null,
          statusBefore: "pending",
          statusAfter: "approved",
          sortField: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // Validate all results have both statusBefore="pending" AND statusAfter="approved"
  for (const snapshot of combinedFilterResult.data) {
    TestValidator.equals(
      "statusBefore should be pending",
      snapshot.statusBefore,
      "pending",
    );
    TestValidator.equals(
      "statusAfter should be approved",
      snapshot.statusAfter,
      "approved",
    );
  }
  // Test (d): Empty results are returned when no snapshots match the filter criteria
  // Using a filter combination that doesn't exist (approved→pending is reverse of typical flow)
  const emptyResult =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest1.id,
        body: {
          page: 1,
          limit: 20,
          createdAtFrom: null,
          createdAtTo: null,
          statusBefore: "approved",
          statusAfter: "pending",
          sortField: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "pagination shows zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "data array should be empty",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals("pages should be zero", emptyResult.pagination.pages, 0);
  // Test (e): Filter with rejected status to test another valid transition
  const rejectedResult =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest2.id,
        body: {
          page: 1,
          limit: 20,
          createdAtFrom: null,
          createdAtTo: null,
          statusBefore: "pending",
          statusAfter: "rejected",
          sortField: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // Validate all results have statusBefore="pending" and statusAfter="rejected"
  for (const snapshot of rejectedResult.data) {
    TestValidator.equals(
      "statusBefore should be pending",
      snapshot.statusBefore,
      "pending",
    );
    TestValidator.equals(
      "statusAfter should be rejected",
      snapshot.statusAfter,
      "rejected",
    );
  }
}
