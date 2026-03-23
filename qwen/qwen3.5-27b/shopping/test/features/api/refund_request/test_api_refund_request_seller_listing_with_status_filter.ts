import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
/**
 * Test seller refund request listing with status filtering.
 *
 * This test validates that an authenticated seller can retrieve and filter
 * their refund requests by status (pending, approved, rejected). The test
 * verifies pagination metadata, order item details in refund requests,
 * and proper sorting by requested_at in descending order.
 */
export async function test_api_refund_request_seller_listing_with_status_filter(connection: api.IConnection): Promise<void> {
    // 1. Setup: Register and authenticate as seller
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerEmail = typia.random<string & tags.Format<"email">>();
    const sellerPassword = RandomGenerator.alphaNumeric(16);
    await authorize_seller_join(sellerConnection, {
        body: {
            email: sellerEmail,
            password: sellerPassword,
            shop_name: RandomGenerator.name(2),
            shop_description: RandomGenerator.paragraph({ sentences: 2 }),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IShoppingMallSeller.IJoin,
    });
    // 2. Setup: Register and authenticate as customer
    const customerConnection: api.IConnection = { host: connection.host };
    const customerEmail = typia.random<string & tags.Format<"email">>();
    const customerPassword = RandomGenerator.alphaNumeric(16);
    await authorize_customer_join(customerConnection, {
        body: {
            email: customerEmail,
            password: customerPassword,
            display_name: RandomGenerator.name(),
            phone_number: RandomGenerator.mobile(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IShoppingMallCustomer.IJoin,
    });
    // 3. Setup: Customer creates an order
    const order = await generate_random_shopping_mall_customer_customers_me_orders_create(customerConnection, {});
    typia.assert(order);
    // Verify order has items before creating refund requests
    TestValidator.predicate("order has at least one item", order.orderItems.length > 0);
    // 4. Setup: Create first refund request (will be pending)
    const refundRequest1 = await generate_random_shopping_mall_customer_refund_requests_create(customerConnection, {
        body: {
            orderItemId: order.orderItems[0].id,
            reason: "Product arrived damaged",
        } satisfies IShoppingMallRefundRequest.ICreate,
    });
    typia.assert(refundRequest1);
    // 5. Setup: Create second refund request (will be pending)
    const refundRequest2 = await generate_random_shopping_mall_customer_refund_requests_create(customerConnection, {
        body: {
            orderItemId: order.orderItems[0].id,
            reason: "Wrong item received",
        } satisfies IShoppingMallRefundRequest.ICreate,
    });
    typia.assert(refundRequest2);
    // Test Step 1: Seller calls with status='pending' filter
    const pendingFilter = {
        status: "pending" as const,
    } satisfies IShoppingMallRefundRequest.IRequest;
    const pendingResult = await api.functional.shoppingMall.seller.refund_requests.index(sellerConnection, { body: pendingFilter });
    typia.assert(pendingResult);
    // Verify Step 2: Response contains only pending refund requests
    TestValidator.equals("pending filter returns correct count", pendingResult.data.length, 2);
    // Verify both created requests are in the result
    const pendingIds = pendingResult.data.map((r) => r.id);
    TestValidator.predicate("first refund request is in pending results", pendingIds.includes(refundRequest1.id));
    TestValidator.predicate("second refund request is in pending results", pendingIds.includes(refundRequest2.id));
    // Verify Step 3: Pagination metadata is correct
    TestValidator.equals("pending pagination current page", pendingResult.pagination.current, 1);
    TestValidator.equals("pending pagination records", pendingResult.pagination.records, 2);
    TestValidator.predicate("pending pagination has valid pages", pendingResult.pagination.pages >= 1);
    // Verify Step 4: Each refund request has valid order item details
    await ArrayUtil.asyncForEach(pendingResult.data, async (request, index) => {
        TestValidator.predicate(`request ${index} has valid quantity`, request.orderItem.quantity > 0);
        TestValidator.predicate(`request ${index} has valid price`, request.orderItem.price >= 0);
        TestValidator.equals(`request ${index} status is pending`, request.status, "pending");
        TestValidator.equals(`request ${index} responded_at is null`, request.responded_at, null);
    });
    // Test Step 5: Seller calls with status='approved' filter
    const approvedFilter = {
        status: "approved" as const,
    } satisfies IShoppingMallRefundRequest.IRequest;
    const approvedResult = await api.functional.shoppingMall.seller.refund_requests.index(sellerConnection, { body: approvedFilter });
    typia.assert(approvedResult);
    // Verify Step 6: Response contains only approved refund requests (should be 0)
    TestValidator.equals("approved filter returns zero requests", approvedResult.data.length, 0);
    // Verify Step 7: Pagination metadata for empty result
    TestValidator.equals("approved pagination records", approvedResult.pagination.records, 0);
    // Test Step 8: Seller calls with status='rejected' filter
    const rejectedFilter = {
        status: "rejected" as const,
    } satisfies IShoppingMallRefundRequest.IRequest;
    const rejectedResult = await api.functional.shoppingMall.seller.refund_requests.index(sellerConnection, { body: rejectedFilter });
    typia.assert(rejectedResult);
    // Verify Step 9: Response contains only rejected refund requests (should be 0)
    TestValidator.equals("rejected filter returns zero requests", rejectedResult.data.length, 0);
    // Test Step 10: Seller calls without filters
    const noFilter = {} satisfies IShoppingMallRefundRequest.IRequest;
    const allResult = await api.functional.shoppingMall.seller.refund_requests.index(sellerConnection, { body: noFilter });
    typia.assert(allResult);
    // Verify Step 11: Response contains all refund requests
    TestValidator.equals("no filter returns all requests", allResult.data.length, 2);
    // Verify sorting by requested_at DESC (newest first)
    if (allResult.data.length >= 2) {
        TestValidator.predicate("results sorted by requested_at DESC", allResult.data[0].requested_at >= allResult.data[1].requested_at);
    }
    // Test with pagination parameters
    const paginationFilter = {
        page: 1,
        limit: 1,
    } satisfies IShoppingMallRefundRequest.IRequest;
    const paginatedResult = await api.functional.shoppingMall.seller.refund_requests.index(sellerConnection, { body: paginationFilter });
    typia.assert(paginatedResult);
    // Verify pagination works correctly
    TestValidator.equals("paginated result returns 1 item", paginatedResult.data.length, 1);
    TestValidator.equals("paginated current page", paginatedResult.pagination.current, 1);
    TestValidator.equals("paginated limit", paginatedResult.pagination.limit, 1);
    TestValidator.equals("paginated total records", paginatedResult.pagination.records, 2);
    TestValidator.equals("paginated total pages", paginatedResult.pagination.pages, 2);
}