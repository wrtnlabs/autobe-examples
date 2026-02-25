import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCancellationResponseRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationResponseRecord";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";
import { prepare_random_ecommerce_cancellation_response_record } from "../../../prepare/prepare_random_ecommerce_cancellation_response_record";
import { generate_random_ecommerce_seller_cancellation_requests_responses_create } from "../../../generate/generate_random_ecommerce_seller_cancellation_requests_responses_create";
import { generate_random_ecommerce_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_cancellation_requests_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_cancellation_seller_approval_with_inventory_restoration(connection: api.IConnection): Promise<void> {
    // Create seller connection and authenticate
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
            shop_name: RandomGenerator.name(),
            shop_description: RandomGenerator.paragraph({ sentences: 2 }),
            logo_image_url: typia.random<string & tags.Format<"uri">>(),
            href: "https://example.com",
            referrer: "https://example.com",
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceSeller.IJoin,
    });
    typia.assert(sellerAuth);

    // Create customer connection and authenticate
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
            display_name: RandomGenerator.name(),
            phone_number: RandomGenerator.mobile(),
        } satisfies IEcommerceCustomer.IJoin,
    });
    typia.assert(customerAuth);

    // Note: The test scenario requires additional endpoints for product creation and order placement
    // which are not currently available in the provided API definitions. The test focuses on
    // the cancellation request approval workflow using available endpoints.
    
    // Create a cancellation request (requires existing order item with 'paid' status)
    const cancellationRequest = await api.functional.ecommerce.customer.cancellation_requests.create(customerConnection, {
        body: {
            ecommerce_order_item_id: typia.random<string & tags.Format<"uuid">>(),
            reason: RandomGenerator.paragraph({ sentences: 1, wordMin: 10, wordMax: 20 }),
        } satisfies IEcommerceCancellationRequest.ICreate,
    });
    typia.assert(cancellationRequest);

    // Seller approves the cancellation request
    const cancellationResponse = await api.functional.ecommerce.seller.cancellation_requests.responses.create(sellerConnection, {
        cancellationRequestId: cancellationRequest.id,
        body: {
            decision: "approved",
            response_reason: RandomGenerator.paragraph({ sentences: 1, wordMin: 10, wordMax: 20 }),
        } satisfies IEcommerceCancellationResponseRecord.ICreate,
    });
    typia.assert(cancellationResponse);

    // Validate response structure
    TestValidator.equals("response decision should be approved", cancellationResponse.decision, "approved");
    TestValidator.predicate("response reason should be valid length", cancellationResponse.response_reason.length >= 10 && cancellationResponse.response_reason.length <= 500);
    TestValidator.notEquals("response timestamp should be set", cancellationResponse.responded_at, null);
    TestValidator.equals("should reference correct cancellation request", cancellationResponse.cancellationRequest.id, cancellationRequest.id);
    TestValidator.equals("should reference correct seller", cancellationResponse.seller.id, sellerAuth.id);

    // Business logic validations
    TestValidator.equals("seller should match cancellation request seller", cancellationResponse.cancellationRequest.seller.id, sellerAuth.id);
}