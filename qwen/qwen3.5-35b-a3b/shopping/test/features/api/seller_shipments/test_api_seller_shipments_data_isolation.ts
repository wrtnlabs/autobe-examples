import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_shipments_data_isolation(connection: api.IConnection): Promise<void> {
    // Step 1: Join Seller A
    const sellerAJoinConnection: api.IConnection = { host: connection.host };
    const sellerA = await authorize_seller_join(sellerAJoinConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: "https://seller-a.example.com",
            referrer: "https://referrer-a.example.com",
        } satisfies IEcommerceMallSeller.IJoin,
    });
    typia.assert(sellerA);
    // Step 2: Join Seller B (different seller for isolation testing)
    const sellerBJoinConnection: api.IConnection = { host: connection.host };
    const sellerB = await authorize_seller_join(sellerBJoinConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: "https://seller-b.example.com",
            referrer: "https://referrer-b.example.com",
        } satisfies IEcommerceMallSeller.IJoin,
    });
    typia.assert(sellerB);
    // Step 3: Seller A creates shipment
    const sellerAConnection: api.IConnection = { host: connection.host };
    sellerAConnection.headers = {
        Authorization: sellerA.token.access,
    };
    const sellerAShipment = await api.functional.ecommerceMall.seller.shipments.create(sellerAConnection, {
        body: {
            order_item_ids: ArrayUtil.repeat(1, () => typia.random<string & tags.Format<"uuid">>()),
            carrier_name: RandomGenerator.name(2),
        } satisfies IEcommerceMallShipment.ICreate,
    });
    typia.assert(sellerAShipment);
    // Step 4: Seller B creates shipment
    const sellerBConnection: api.IConnection = { host: connection.host };
    sellerBConnection.headers = {
        Authorization: sellerB.token.access,
    };
    const sellerBShipment = await api.functional.ecommerceMall.seller.shipments.create(sellerBConnection, {
        body: {
            order_item_ids: ArrayUtil.repeat(1, () => typia.random<string & tags.Format<"uuid">>()),
            carrier_name: RandomGenerator.name(2),
        } satisfies IEcommerceMallShipment.ICreate,
    });
    typia.assert(sellerBShipment);
    // Step 5: Seller A queries shipments - should only see Seller A's shipment
    const sellerAShipmentsResponse = await api.functional.ecommerceMall.seller.shipments.index(sellerAConnection, {
        body: {
            page: 1,
            limit: 20,
        } satisfies IEcommerceMallShipment.IRequest,
    });
    typia.assert(sellerAShipmentsResponse);
    TestValidator.equals("Seller A shipment count", sellerAShipmentsResponse.data.length, 1);
    TestValidator.equals("Seller A shipment is unique to Seller A", sellerAShipmentsResponse.data[0].id, sellerAShipment.id);
    // Step 6: Seller B queries shipments - should only see Seller B's shipment
    const sellerBShipmentsResponse = await api.functional.ecommerceMall.seller.shipments.index(sellerBConnection, {
        body: {
            page: 1,
            limit: 20,
        } satisfies IEcommerceMallShipment.IRequest,
    });
    typia.assert(sellerBShipmentsResponse);
    TestValidator.equals("Seller B shipment count", sellerBShipmentsResponse.data.length, 1);
    TestValidator.equals("Seller B shipment is unique to Seller B", sellerBShipmentsResponse.data[0].id, sellerBShipment.id);
    // Step 7: Verify each shipment references correct order data
    TestValidator.predicate("Seller A shipment order has valid order number", sellerAShipmentsResponse.data[0].order.order_number.length > 0);
    TestValidator.predicate("Seller A shipment order has valid total price", sellerAShipmentsResponse.data[0].order.total_price > 0);
    TestValidator.predicate("Seller A shipment order has status", sellerAShipmentsResponse.data[0].order.status.length > 0);
    TestValidator.equals("Seller A shipment order has shipping address", sellerAShipmentsResponse.data[0].order.shipping_address !== undefined, true);
    // Step 8: Verify tracking count accuracy
    TestValidator.equals("Seller A shipment tracking count is non-negative", sellerAShipmentsResponse.data[0].trackingCount >= 0, true);
    TestValidator.equals("Seller B shipment tracking count is non-negative", sellerBShipmentsResponse.data[0].trackingCount >= 0, true);
    // Step 9: Verify isolation - Seller A cannot see Seller B's shipment
    const sellerAIds = sellerAShipmentsResponse.data.map((s) => s.id);
    TestValidator.equals("Seller A cannot access Seller B's shipment", sellerAIds.includes(sellerBShipment.id), false);
    // Step 10: Verify isolation - Seller B cannot see Seller A's shipment
    const sellerBIds = sellerBShipmentsResponse.data.map((s) => s.id);
    TestValidator.equals("Seller B cannot access Seller A's shipment", sellerBIds.includes(sellerAShipment.id), false);
}
// Helper function for creating shipment (simplified from generate_random_...)
async function authorize_seller_login(connection: api.IConnection, props: {
    body: {
        email: string;
        password: string;
    };
}): Promise<IEcommerceMallSeller.IAuthorized> {
    return await api.functional.ecommerceMall.auth.seller.login(connection, {
        body: props.body,
    });
}