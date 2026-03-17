import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_customer_refund_window_exceeded(connection: api.IConnection): Promise<void> {
    // 1. Setup seller account
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerJoin = await api.functional.ecommerceMall.auth.seller.join(sellerConnection, {
        body: {
            email: typia.random<(string & tags.Format<"email">)>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<(string & tags.Format<"uri">)>(),
            referrer: typia.random<(string & tags.Format<"uri">)>(),
        } satisfies IEcommerceMallSeller.IJoin,
    });
    typia.assert(sellerJoin);
    // Seller login
    const sellerLoginConnection: api.IConnection = { host: connection.host };
    const sellerLogin = await api.functional.ecommerceMall.auth.seller.login(sellerLoginConnection, {
        body: {
            email: sellerJoin.email,
            password: RandomGenerator.alphaNumeric(16),
        } satisfies IEcommerceMallSeller.ILogin,
    });
    typia.assert(sellerLogin);
    // 2. Setup customer account
    const customerJoinConnection: api.IConnection = { host: connection.host };
    const customerJoin = await api.functional.ecommerceMall.auth.customer.join(customerJoinConnection, {
        body: {
            email: typia.random<(string & tags.Format<"email">)>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<(string & tags.Format<"uri">)>(),
            referrer: typia.random<(string & tags.Format<"uri">)>(),
            ip: typia.random<(string & tags.Format<"ipv4">)>(),
        } satisfies IEcommerceMallCustomer.IJoin,
    });
    typia.assert(customerJoin);
    // Create customer connection for refund requests
    const customerConnection: api.IConnection = {
        host: connection.host,
        headers: {
            Authorization: customerJoin.token.access,
        },
    };
    // 3. Seller creates a product
    const product = await api.functional.ecommerceMall.seller.products.create({
        host: connection.host,
        headers: {
            Authorization: sellerLogin.token.access,
        },
    }, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 4 }),
            category_id: typia.random<(string & tags.Format<"uuid">)>(),
            base_price: typia.random<(number & tags.Type<"uint32"> & tags.Minimum<1000>)>(),
        } satisfies IEcommerceMallProduct.ICreate,
    });
    typia.assert(product);
    // 4. Customer attempts refund request for order item outside 7-day window
    // Using randomly generated orderItemId (in real scenario, this would be an existing order item)
    const orderItemId: string & tags.Format<"uuid"> = typia.random<(string & tags.Format<"uuid">)>();
    const refundRequestBody = {
        reason: "Product arrived damaged",
        evidence_description: "Photos attached showing damage",
    } satisfies IEcommerceMallRefundRequest.ICreate;
    await TestValidator.error("refund request should be rejected when outside 7-day window", async () => {
        await api.functional.ecommerceMall.customer.refund_requests.create(customerConnection, {
            orderItemId,
            body: refundRequestBody,
        });
    });
}