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
 * Validate retrieval of refund request details as the transaction party seller.
 *
 * - Register seller and customer.
 * - Customer creates refund request for a valid order (order assumed to exist or
 *   stubbed via refund request's order reference as required by API design).
 * - Authenticate as the seller.
 * - Retrieve the refund request detail by ID as the seller (must succeed).
 * - Validate all fields (order, customer, seller summaries, status, monetary
 *   amounts, reason).
 * - Verify access controls: unrelated seller cannot access the refund request
 *   (must be forbidden or error).
 */
export async function test_api_seller_refund_request_detail_retrieval(
  connection: api.IConnection,
) {
  // Register new seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphaNumeric(10);
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword as string & tags.Format<"password">,
        business_name: RandomGenerator.name(),
        registration_number: RandomGenerator.alphaNumeric(15),
        business_phone: RandomGenerator.mobile(),
        href: "https://seller-join-href.com/" + RandomGenerator.alphaNumeric(8),
        referrer: "https://referrer.com/start",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Register customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string = RandomGenerator.alphaNumeric(10);
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword as string &
          tags.MinLength<8> &
          tags.Format<"password">,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Simulate order summary (stub for required fields)
  const orderSummary: IShoppingMallOrder.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    order_number: RandomGenerator.alphaNumeric(12),
    status: "paid",
    total_amount: 50000,
    currency: "KRW",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: undefined,
  };
  typia.assert(orderSummary);

  // Customer logs in before refund request creation
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://login.customer.com/" + RandomGenerator.alphaNumeric(6),
      referrer: "https://referrer.com/customer",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Create refund request as customer
  const refundRequestBody = {
    shopping_mall_order_id: orderSummary.id,
    reason: "Product did not arrive as described.",
    requested_amount: orderSummary.total_amount,
    shopping_mall_seller_id: seller.id,
  } satisfies IShoppingMallRefundRequest.ICreate;

  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.customer.refundRequests.create(
      connection,
      {
        body: refundRequestBody,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request order",
    refundRequest.order.id,
    orderSummary.id,
  );
  TestValidator.equals(
    "refund request customer",
    refundRequest.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "refund request seller",
    refundRequest.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "refund request status",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "refund request amount",
    refundRequest.requested_amount,
    orderSummary.total_amount,
  );
  TestValidator.equals(
    "refund request reason",
    refundRequest.reason,
    refundRequestBody.reason,
  );

  // Seller login before retrieving refund request
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://login.seller.com/" + RandomGenerator.alphaNumeric(6),
      referrer: "https://referrer.com/seller",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Retrieve refund request as seller (should succeed)
  const sellerAccessed: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.seller.refundRequests.at(connection, {
      refundRequestId: refundRequest.id,
    });
  typia.assert(sellerAccessed);
  TestValidator.equals(
    "refund details id match",
    sellerAccessed.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "order summary match",
    sellerAccessed.order,
    refundRequest.order,
  );
  TestValidator.equals(
    "customer summary match",
    sellerAccessed.customer,
    refundRequest.customer,
  );
  TestValidator.equals(
    "seller summary match",
    sellerAccessed.seller,
    refundRequest.seller,
  );
  TestValidator.equals(
    "status match",
    sellerAccessed.status,
    refundRequest.status,
  );
  TestValidator.equals(
    "amount match",
    sellerAccessed.requested_amount,
    refundRequest.requested_amount,
  );
  TestValidator.equals(
    "reason match",
    sellerAccessed.reason,
    refundRequest.reason,
  );

  // Register another seller to test access denial
  const otherSellerEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const otherSellerPassword: string = RandomGenerator.alphaNumeric(10);
  const otherSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: otherSellerEmail,
        password: otherSellerPassword as string & tags.Format<"password">,
        business_name: RandomGenerator.name(),
        registration_number: RandomGenerator.alphaNumeric(15),
        business_phone: RandomGenerator.mobile(),
        href: "https://seller-join-href.com/" + RandomGenerator.alphaNumeric(8),
        referrer: "https://referrer.com/start",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(otherSeller);

  // Login as unrelated seller
  await api.functional.auth.seller.login(connection, {
    body: {
      email: otherSellerEmail,
      password: otherSellerPassword,
      href: "https://login.otherseller.com/" + RandomGenerator.alphaNumeric(6),
      referrer: "https://referrer.com/otherseller",
    } satisfies IShoppingMallSeller.ILogin,
  });
  // Attempt to retrieve refund request as unrelated seller (should fail)
  await TestValidator.error(
    "unrelated seller cannot access another's refund request",
    async () => {
      await api.functional.shoppingMall.seller.refundRequests.at(connection, {
        refundRequestId: refundRequest.id,
      });
    },
  );
}
