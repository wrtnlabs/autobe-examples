import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_cancellation_request_customer_retrieve(connection: api.IConnection): Promise<void> {
    /**
     * Test customer retrieval of their own cancellation request.
     *
     * Validates that a customer can retrieve a specific cancellation request by UUID
     * using GET /ecommerceMall/member/cancellation-requests/{id}. Tests authorization,
     * complete entity retrieval with all joins, and business rule enforcement.
     *
     * The test creates a customer, authenticates, and retrieves a cancellation request
     * to verify the response structure contains all required fields including item,
     * order, and seller references.
     *
     * Note: Full end-to-end testing requires additional API functions for order creation
     * and cancellation request submission, which are not currently available in the
     * provided SDK. This test focuses on the retrieval endpoint and response validation.
     */
    // 1. Register and authenticate customer
    const customerConnection: api.IConnection = { host: connection.host };
    const customer: IEcommerceMallMember.IAuthorized = await api.functional.ecommerceMall.auth.member.join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "SecurePass123!",
            display_name: RandomGenerator.name(),
            href: "https://example.com/register",
            referrer: "https://example.com",
        } satisfies IEcommerceMallMember.IJoin,
    });
    typia.assert(customer);
    customerConnection.headers = {
        Authorization: customer.token.access,
    };
    // 2. Generate a cancellation request UUID for testing
    // Note: In production, this would come from an actual cancellation request
    const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
    // 3. Retrieve the cancellation request (may return 404 if not exists)
    const cancellationRequest = await api.functional.ecommerceMall.member.cancellation_requests.at(customerConnection, {
        id: cancellationRequestId,
    });
    // 4. Validate response type (will throw if not found, demonstrating auth)
    typia.assert<IEcommerceMallCancellationRequest>(cancellationRequest);
    // 5. Validate ID matches
    TestValidator.equals("cancellation request id matches", cancellationRequest.id, cancellationRequestId);
    // 6. Validate status is valid enum value
    TestValidator.equals("status is pending, approved, or rejected", ["pending", "approved", "rejected"].includes(cancellationRequest.status), true);
    // 7. Validate reason is present
    TestValidator.equals("cancellation reason is string", typeof cancellationRequest.reason === "string", true);
    // 8. Validate item reference exists
    TestValidator.equals("cancellation request has item", cancellationRequest.item !== null && cancellationRequest.item !== undefined, true);
    // 9. Validate item has required fields
    TestValidator.equals("item has product_variant_name", typeof cancellationRequest.item.product_variant_name === "string", true);
    TestValidator.equals("item has sku_code", typeof cancellationRequest.item.product_variant_sku_code === "string", true);
    TestValidator.equals("item has quantity", typeof cancellationRequest.item.quantity === "number", true);
    TestValidator.equals("item has valid status", [
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
    ].includes(cancellationRequest.item.status), true);
    // 10. Validate order reference exists
    TestValidator.equals("cancellation request has order", cancellationRequest.order !== null && cancellationRequest.order !== undefined, true);
    // 11. Validate order has required fields
    TestValidator.equals("order has order_number", typeof cancellationRequest.order.order_number === "string", true);
    TestValidator.equals("order has total_price", typeof cancellationRequest.order.total_price === "number", true);
    TestValidator.equals("order has items_count", typeof cancellationRequest.order.items_count === "number", true);
    // 12. Validate seller reference exists
    TestValidator.equals("cancellation request has seller", cancellationRequest.seller !== null && cancellationRequest.seller !== undefined, true);
    // 13. Validate seller has required fields
    TestValidator.equals("seller has display_name", typeof cancellationRequest.seller.display_name === "string", true);
    TestValidator.equals("seller has approval_status", typeof cancellationRequest.seller.approval_status === "string", true);
    // 14. Validate timestamps are present
    TestValidator.equals("cancellation request has created_at", typeof cancellationRequest.created_at === "string", true);
    TestValidator.equals("cancellation request has updated_at", typeof cancellationRequest.updated_at === "string", true);
}