import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentTrackingUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentTrackingUpdate";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipmentTrackingUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentTrackingUpdate";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_customer_tracking_update_success(connection: api.IConnection): Promise<void> {
    // 1. Customer join
    const customerJoinConnection: api.IConnection = { host: connection.host };
    const customerJoin = await authorize_customer_join(customerJoinConnection, {});
    typia.assert(customerJoin);
    // 2. Seller join  
    const sellerJoinConnection: api.IConnection = { host: connection.host };
    const sellerJoin = await authorize_seller_join(sellerJoinConnection, {});
    typia.assert(sellerJoin);
    // 3. Create shipment using seller
    const mockOrderId = typia.random<string & tags.Format<"uuid">>();
    const shipment = await api.functional.ecommerceMall.seller.shipments.create(sellerJoinConnection, {
        body: {
            order_item_ids: [mockOrderId],
            carrier_name: RandomGenerator.alphaNumeric(10),
            carrier_phone: RandomGenerator.mobile(),
        } satisfies IEcommerceMallShipment.ICreate,
    });
    typia.assert(shipment);
    // 4. Customer updates tracking status
    const trackingUpdateInput: DeepPartial<IEcommerceMallShipmentTrackingUpdate.IRequest> = {
        tracking_status: "in_transit" as const,
    };
    const customerTrackingConnection: api.IConnection = {
        host: connection.host,
    };
    const trackingResponse: IPageIEcommerceMallShipmentTrackingUpdate.ISummary = await api.functional.ecommerceMall.customer.shipments.tracking_updates
        .updateTrackingUpdates(customerTrackingConnection, {
        shipmentId: shipment.id,
        body: trackingUpdateInput,
    });
    typia.assert(trackingResponse);
    // 5. Verify tracking update in response
    const trackingData = trackingResponse.data[0];
    typia.assert(trackingData);
    TestValidator.equals("tracking status updated to in_transit", trackingData.tracking_status, "in_transit");
    TestValidator.equals("tracking belongs to correct shipment", trackingData.shipment.id, shipment.id);
    // 6. Verify pagination metadata
    TestValidator.equals("pagination has records", trackingResponse.pagination.records, 1);
    TestValidator.equals("pagination current page", trackingResponse.pagination.current, 1);
    TestValidator.equals("pagination data array has records", trackingResponse.data.length, 1);
}