import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";
import { generate_random_ecommerce_customer_orders_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_cancellation_requests_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_cancellation_request_approval(connection: api.IConnection): Promise<void> {
    // Create customer connection for customer operations
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_login(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
        }
    });
    
    const orderUid = typia.random<string & tags.Format<"uuid">>();
    
    // Create cancellation request for the order
    const cancellationRequest = await generate_random_ecommerce_customer_orders_cancellation_requests_create(customerConnection, {
        params: { orderId: orderUid },
    });
    typia.assert(cancellationRequest);
    
    // Create seller connection for seller operations
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_login(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
        }
    });
    
    // Update cancellation request to approved status
    const updatedCancellationRequest = await api.functional.ecommerce.seller.orders.cancellation_requests.update(sellerConnection, {
        orderId: orderUid,
        cancellationRequestId: cancellationRequest.id,
        body: { status: "approved" }
    });
    typia.assert(updatedCancellationRequest);
    
    // Verify cancellation request status is updated to 'approved'
    TestValidator.equals("Cancellation request status should be 'approved'", updatedCancellationRequest.status, "approved");
}