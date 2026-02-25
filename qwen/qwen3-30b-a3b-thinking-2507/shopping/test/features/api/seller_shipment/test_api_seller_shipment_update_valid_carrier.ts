import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";
import { generate_random_ecommerce_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_seller_orders_shipments_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_shipment_update_valid_carrier(connection: api.IConnection): Promise<void> {
    // 1. Seller registration
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "1234",
        }
    });
    typia.assert(seller);
    
    // 2. Create shipment for order
    const shipment = await generate_random_ecommerce_seller_orders_shipments_create(sellerConnection, {
        params: { id: typia.random<string & tags.Format<"uuid">>() },
        body: {
            carrier_name: "FedEx",
            tracking_number: typia.random<string & tags.MinLength<10>>(),
        }
    });
    typia.assert(shipment);
    
    // 3. Update shipment carrier to UPS with 10-character tracking number
    const updatedShipment = await api.functional.ecommerce.seller.orders.shipments.update(sellerConnection, {
        orderId: shipment.order.id,
        shipmentId: shipment.id,
        body: {
            carrier_name: "UPS",
            tracking_number: "1234567890",
        }
    });
    typia.assert(updatedShipment);
    
    // 4. Validate updated shipment data
    TestValidator.equals("Carrier updated to UPS", updatedShipment.carrier_name, "UPS");
    TestValidator.equals("Tracking number matches", updatedShipment.tracking_number, "1234567890");
}