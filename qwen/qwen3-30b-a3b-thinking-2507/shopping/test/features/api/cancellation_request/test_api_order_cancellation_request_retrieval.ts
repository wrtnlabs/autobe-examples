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
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";
import { generate_random_ecommerce_customer_orders_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_cancellation_requests_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_order_cancellation_request_retrieval(connection: api.IConnection): Promise<void> {
    // 1. Customer registration
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "Password123!",
            href: "https://example.com/signup",
            referrer: "https://example.com/home",
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    
    // 2. Create order (mock)
    const orderId = typia.random<string & tags.Format<"uuid">>();
    
    // 3. Create cancellation request
    const cancellationRequest = await api.functional.ecommerce.customer.orders.cancellation_requests.create(customerConnection, {
        orderId,
        body: {
            reason: typia.random<string & tags.MinLength<10> & tags.MaxLength<500>>(),
        },
    });
    typia.assert(cancellationRequest);
    
    // 4. Retrieve cancellation request
    const retrievedRequest = await api.functional.ecommerce.customer.orders.cancellation_requests.at(customerConnection, {
        orderId,
        cancellationRequestId: cancellationRequest.id,
    });
    typia.assert(retrievedRequest);
    
    // 5. Validate response
    TestValidator.equals("Reason matches input", retrievedRequest.reason, cancellationRequest.reason);
    TestValidator.equals("Status is pending", retrievedRequest.status, "pending");
    TestValidator.predicate("Created at is valid timestamp", !!retrievedRequest.created_at);
    TestValidator.predicate("Updated at is valid timestamp", !!retrievedRequest.updated_at);
    TestValidator.equals("Order item matches", retrievedRequest.orderItem.id, orderId);
}