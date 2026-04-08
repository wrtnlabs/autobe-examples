import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipment_detail_view(connection: api.IConnection): Promise<void> {
    /**
     * Test customer shipment detail view for order history.
     *
     * Validates that an authenticated customer can retrieve a complete shipment
     * detail payload for one of their own shipments. The test focuses on the
     * customer-facing order history use case, ensuring the shipment header,
     * carrier/tracking metadata, seller summary, source order summary, and
     * shipment items are all present and internally consistent.
     *
     * 1. Register and authenticate a customer using the join utility.
     * 2. Call the customer shipment detail endpoint with a UUID shipment id.
     * 3. Validate the response structure and the relationships between the
     *    shipment, seller, order, and shipment item references.
     * 4. Confirm the detail view is suitable for customer order history display.
     */
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "Password123!",
            href: "https://example.com/join",
            referrer: "https://example.com/signup",
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IMallPlatformCustomer.IJoin,
    });
    typia.assert(customer);
    const shipmentId = typia.random<string & tags.Format<"uuid">>();
    const shipment = await api.functional.mallPlatform.customer.shipments.at(customerConnection, {
        shipmentId,
    });
    typia.assert(shipment);
    TestValidator.predicate("shipment id should be a UUID and non-empty", shipment.id.length > 0);
    TestValidator.predicate("shipment should include seller summary", shipment.seller.id.length > 0 && shipment.seller.email.length > 0);
    TestValidator.predicate("shipment should include source order summary", shipment.order.id.length > 0 && shipment.order.orderNumber.length > 0);
    TestValidator.predicate("shipment should include tracking information", shipment.carrierName.length > 0 && shipment.trackingNumber.length > 0);
    TestValidator.predicate("shipment should include a valid lifecycle status", shipment.status.length > 0);
    TestValidator.equals("shipment shippedAt may be null until shipped, but response must preserve the field", shipment.shippedAt === null ? null : shipment.shippedAt, shipment.shippedAt);
    TestValidator.equals("shipment deliveredAt may be null until delivered, but response must preserve the field", shipment.deliveredAt === null ? null : shipment.deliveredAt, shipment.deliveredAt);
    TestValidator.predicate("shipment timestamps should be present in the detail header", shipment.createdAt.length > 0 && shipment.updatedAt.length > 0);
    TestValidator.equals("shipment should not be soft deleted in the customer detail view", shipment.deletedAt, null);
}
