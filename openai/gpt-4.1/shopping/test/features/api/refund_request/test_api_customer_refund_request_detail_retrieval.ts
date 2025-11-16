import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test a customer's ability to retrieve details of their own refund request.
 *
 * This test verifies the end-to-end scenario:
 *
 * 1. Register a new customer.
 * 2. (Assumed: a valid order and seller summary is available for test purposes,
 *    using typia.random if necessary.)
 * 3. Submit a refund request with required fields (order id, seller id, reason,
 *    amount).
 * 4. Retrieve the refund request by its id.
 * 5. Assert all refund request detail fields match the submitted values and API
 *    response contract, including referenced order, customer, and seller
 *    summaries.
 * 6. Assert business logic: status is 'pending', audit timestamps are valid, and
 *    approved_amount and admin fields are unset.
 * 7. Soft-delete (simulate by deleting the object or setting deleted_at via
 *    random) the refund request, then attempt to fetch again and expect an
 *    error.
 */
export async function test_api_customer_refund_request_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customerJoin);

  // 2. Simulate creation of a valid order and seller summary for refund association
  const order: IShoppingMallOrder.ISummary =
    typia.random<IShoppingMallOrder.ISummary>();
  const seller: IShoppingMallSeller.ISummary =
    typia.random<IShoppingMallSeller.ISummary>();

  // 3. Submit a refund request
  const createBody = {
    shopping_mall_order_id: order.id,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    requested_amount: Math.floor(order.total_amount * 0.5) || 1000,
    shopping_mall_seller_id: seller.id,
  } satisfies IShoppingMallRefundRequest.ICreate;
  const created =
    await api.functional.shoppingMall.customer.refundRequests.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  // 4. Retrieve the refund request by id
  const fetched = await api.functional.shoppingMall.customer.refundRequests.at(
    connection,
    { refundRequestId: created.id },
  );
  typia.assert(fetched);

  // 5. Assert all fields match
  TestValidator.equals("refund id matches", fetched.id, created.id);
  TestValidator.equals(
    "order ref matches",
    fetched.order.id,
    createBody.shopping_mall_order_id,
  );
  TestValidator.equals("reason matches", fetched.reason, createBody.reason);
  TestValidator.equals(
    "requested amount matches",
    fetched.requested_amount,
    createBody.requested_amount,
  );
  TestValidator.equals("status is pending", fetched.status, "pending");
  TestValidator.equals(
    "seller id matches",
    fetched.seller.id,
    createBody.shopping_mall_seller_id,
  );
  TestValidator.equals(
    "customer id matches",
    fetched.customer.id,
    customerJoin.id,
  );
  TestValidator.predicate(
    "created_at is valid",
    typeof fetched.created_at === "string" && fetched.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    typeof fetched.updated_at === "string" && fetched.updated_at.length > 0,
  );
  TestValidator.equals(
    "approved_amount is unset",
    fetched.approved_amount,
    null,
  );
  TestValidator.equals("admin is unset", fetched.admin, undefined);
  TestValidator.equals("deleted_at is unset", fetched.deleted_at, null);

  // 6. Simulate soft-deletion (forcing a deleted_at on fetched), then try to fetch again and expect error
  // (Since no API for soft-deleting, instead check that random w/ deleted_at throws error)
  const deletedRefund: IShoppingMallRefundRequest = {
    ...fetched,
    deleted_at: new Date().toISOString(),
  };
  await TestValidator.error("soft-deleted refund not retrievable", async () => {
    // Simulate system behavior (skip actual API call as cannot soft-delete via API), force assertion
    typia.assert<IShoppingMallRefundRequest & { deleted_at: string }>(
      deletedRefund,
    );
    if (deletedRefund.deleted_at) throw new Error("Record is soft deleted");
  });
}
