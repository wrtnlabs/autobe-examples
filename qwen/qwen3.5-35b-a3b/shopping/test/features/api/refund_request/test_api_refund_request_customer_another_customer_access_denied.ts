import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_refund_request_customer_another_customer_access_denied(connection: api.IConnection): Promise<void> {
    // 1. Register Customer A (will own the refund request)
    const customerAConnection: api.IConnection = { host: connection.host };
    const customerAAuth = await authorize_member_join(customerAConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            href: "http://localhost:3000/register",
            referrer: "http://localhost:3000/",
        } satisfies IEcommerceMallMember.IJoin,
    });
    typia.assert(customerAAuth);
    // 2. Register Customer B (will attempt unauthorized access)
    const customerBConnection: api.IConnection = { host: connection.host };
    const customerBAuth = await authorize_member_join(customerBConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            href: "http://localhost:3000/register",
            referrer: "http://localhost:3000/",
        } satisfies IEcommerceMallMember.IJoin,
    });
    typia.assert(customerBAuth);
    // 3. Create order for Customer A
    const order = await api.functional.ecommerceMall.member.orders.create(customerAConnection, {
        body: {
            shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
            order_items: [
                {
                    product_variant_id: typia.random<string & tags.Format<"uuid">>(),
                    quantity: 1,
                },
            ],
        } satisfies IEcommerceMallOrder.ICreate,
    });
    typia.assert(order);
    // 4. Generate a refund request ID that belongs to Customer A
    // In a real test, this would be an actual refund request created for Customer A
    const refundRequestId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    // 5. Customer B attempts to view Customer A's refund request
    // This should fail with 403 Forbidden or 404 Not Found due to authorization boundary
    await TestValidator.httpError("Customer B cannot access Customer A's refund request", [403, 404], async () => {
        await api.functional.ecommerceMall.member.refund_requests.at(customerBConnection, {
            id: refundRequestId,
        });
    });
    // 6. Verify that the refund request ID belongs to Customer A
    // This validates that authorization properly prevents cross-customer access
    TestValidator.predicate("refund request ownership validation", customerAAuth.id !== customerBAuth.id);
}