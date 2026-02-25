import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";
import { generate_random_ecommerce_customer_orders_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_refund_requests_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_refund_approved_request(connection: api.IConnection): Promise<void> {
    // Customer setup
    const customerEmail = typia.random<string & tags.Format<"email">>();
    const customerPassword = RandomGenerator.alphaNumeric(16);
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {
        body: {
            email: customerEmail,
            password: customerPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        }
    });
    await authorize_customer_login(customerConnection, {
        body: {
            email: customerEmail,
            password: customerPassword,
        }
    });

    // Create refund request
    const orderID = typia.random<string & tags.Format<"uuid">>();
    const refundRequest = await generate_random_ecommerce_customer_orders_refund_requests_create(customerConnection, {
        params: { id: orderID },
    });

    // Seller setup
    const sellerEmail = typia.random<string & tags.Format<"email">>();
    const sellerPassword = RandomGenerator.alphaNumeric(16);
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_join(sellerConnection, {
        body: {
            email: sellerEmail,
            password: sellerPassword,
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
        }
    });
    await authorize_seller_login(sellerConnection, {
        body: {
            email: sellerEmail,
            password: sellerPassword,
        }
    });

    // Approve refund request
    await api.functional.ecommerce.seller.orders.refund_requests.update(sellerConnection, {
        orderId: orderID,
        refundRequestId: refundRequest.id,
        body: { status: "approved" },
    });

    // Verify status
    const verifiedRefundRequest = await api.functional.ecommerce.customer.orders.refund_requests.at(customerConnection, {
        orderId: orderID,
        refundRequestId: refundRequest.id,
    });
    typia.assert(verifiedRefundRequest);
    TestValidator.equals("refund status is approved", verifiedRefundRequest.status, "approved");
}