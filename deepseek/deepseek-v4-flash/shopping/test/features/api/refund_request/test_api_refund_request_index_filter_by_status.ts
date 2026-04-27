import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_e_commerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_e_commerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

/**
 * Test that the customer refund request index endpoint correctly filters results by request status.
 *
 * Validates the PATCH /eCommerceMall/customer/refund-requests endpoint's status filtering capability. The endpoint accepts a single status value or an array of statuses and must return only requests whose status matches the specified filter criteria. Tests three filter scenarios: single status (pending), single status (approved), and multi-status (pending and approved).
 *
 * 1. Register a customer account using the join authorization utility.
 * 2. Call the index endpoint with status filter set to "pending" and validate all returned items match.
 * 3. Call with status filter set to "approved" and validate all returned items match.
 * 4. Call with status filter set to ["pending", "approved"] and validate all returned items have one of the two statuses.
 */
export async function test_api_refund_request_index_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Register a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Test 1: Filter by pending status
  const pendingPage =
    await api.functional.eCommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
          limit: 100,
        } satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingPage);
  for (const r of pendingPage.data)
    if (r.status !== "pending")
      throw new Error(
        `Pending filter returned refund request with status &quot;${r.status}&quot;, expected &quot;pending&quot;`,
      );
  // Test 2: Filter by approved status
  const approvedPage =
    await api.functional.eCommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "approved",
          limit: 100,
        } satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(approvedPage);
  for (const r of approvedPage.data)
    if (r.status !== "approved")
      throw new Error(
        `Approved filter returned refund request with status &quot;${r.status}&quot;, expected &quot;approved&quot;`,
      );
  // Test 3: Filter by multiple statuses
  const multiStatus: ("pending" | "approved")[] & tags.UniqueItems = [
    "pending",
    "approved",
  ];
  const multiPage =
    await api.functional.eCommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: multiStatus,
          limit: 100,
        } satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(multiPage);
  for (const r of multiPage.data)
    if (r.status !== "pending" && r.status !== "approved")
      throw new Error(
        `Multi-status filter returned refund request with status &quot;${r.status}&quot;, expected &quot;pending&quot; or &quot;approved&quot;`,
      );
}
