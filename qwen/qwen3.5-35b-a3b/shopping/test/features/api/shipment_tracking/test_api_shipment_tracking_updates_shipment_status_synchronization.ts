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
import type { IEcommerceMallShipmentTrackingUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentTrackingUpdate";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipmentTrackingUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentTrackingUpdate";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_shipment_tracking_updates_shipment_status_synchronization(connection: api.IConnection): Promise<void> {
    // 1. Authenticate seller
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallSeller.IJoin,
    });
    typia.assert(seller);
    // Create seller-specific connection with token
    const authenticatedSellerConnection: api.IConnection = {
        host: connection.host,
        headers: {
            Authorization: seller.token.access,
        },
    };
    // 2. Create initial shipment with pending status
    const shipment: IEcommerceMallShipment = await generate_random_ecommerce_mall_seller_shipments_create(authenticatedSellerConnection, {});
    typia.assert(shipment);
    TestValidator.equals("initial shipment status is pending", shipment.status, "pending");
    // 3. Test delivered status synchronization
    const deliveredTrackingUpdate: IPageIEcommerceMallShipmentTrackingUpdate.ISummary = await api.functional.ecommerceMall.seller.shipments.tracking_updates.updateTrackingUpdates(authenticatedSellerConnection, {
        shipmentId: shipment.id,
        body: {
            tracking_status: "delivered",
        } satisfies IEcommerceMallShipmentTrackingUpdate.IRequest,
    });
    typia.assert(deliveredTrackingUpdate);
    // Verify tracking update was created
    TestValidator.equals("tracking update page has data", deliveredTrackingUpdate.data.length, 1);
    const trackingUpdate: IEcommerceMallShipmentTrackingUpdate.ISummary = deliveredTrackingUpdate.data[0];
    typia.assert(trackingUpdate);
    TestValidator.equals("tracking update status is delivered", trackingUpdate.tracking_status, "delivered");
    // 4. Verify tracking update references correct shipment
    TestValidator.equals("parent shipment in tracking update matches", trackingUpdate.shipment.id, shipment.id);
    // 5. Test failed shipment scenario
    const failedTrackingUpdate: IPageIEcommerceMallShipmentTrackingUpdate.ISummary = await api.functional.ecommerceMall.seller.shipments.tracking_updates.updateTrackingUpdates(authenticatedSellerConnection, {
        shipmentId: shipment.id,
        body: {
            tracking_status: "failed",
        } satisfies IEcommerceMallShipmentTrackingUpdate.IRequest,
    });
    typia.assert(failedTrackingUpdate);
    TestValidator.equals("failed tracking update page has data", failedTrackingUpdate.data.length, 1);
    const failedUpdate: IEcommerceMallShipmentTrackingUpdate.ISummary = failedTrackingUpdate.data[0];
    typia.assert(failedUpdate);
    TestValidator.equals("failed tracking update status is failed", failedUpdate.tracking_status, "failed");
    // 6. Test exception status scenario
    const exceptionTrackingUpdate: IPageIEcommerceMallShipmentTrackingUpdate.ISummary = await api.functional.ecommerceMall.seller.shipments.tracking_updates.updateTrackingUpdates(authenticatedSellerConnection, {
        shipmentId: shipment.id,
        body: {
            tracking_status: "exception",
        } satisfies IEcommerceMallShipmentTrackingUpdate.IRequest,
    });
    typia.assert(exceptionTrackingUpdate);
    TestValidator.equals("exception tracking update page has data", exceptionTrackingUpdate.data.length, 1);
    const exceptionUpdate: IEcommerceMallShipmentTrackingUpdate.ISummary = exceptionTrackingUpdate.data[0];
    typia.assert(exceptionUpdate);
    TestValidator.equals("exception tracking update status is exception", exceptionUpdate.tracking_status, "exception");
    // 7. Verify bidirectional consistency
    TestValidator.equals("all tracking updates reference same shipment", trackingUpdate.shipment.id, failedUpdate.shipment.id);
    TestValidator.equals("exception tracking update references same shipment", exceptionUpdate.shipment.id, shipment.id);
}