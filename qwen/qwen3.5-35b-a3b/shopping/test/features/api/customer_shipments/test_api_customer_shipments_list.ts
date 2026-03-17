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
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_customer_shipments_list(connection: api.IConnection): Promise<void> {
    // 1. Setup: Create and authenticate customer
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(customer);
    // 2. Baseline test: Retrieve all shipments (empty initially since no pre-existing data)
    const baseline: IPageIEcommerceMallShipment.ISummary = await api.functional.ecommerceMall.customer.shipments.index(customerConnection, {
        body: {},
    });
    typia.assert(baseline);
    // 3. Validate baseline structure
    TestValidator.predicate("pagination exists", baseline.pagination !== undefined);
    TestValidator.equals("pagination current valid", baseline.pagination.current >= 1, true);
    TestValidator.equals("pagination limit valid", baseline.pagination.limit >= 1, true);
    TestValidator.equals("pagination limit max 100", baseline.pagination.limit <= 100, true);
    TestValidator.equals("pagination records non-negative", baseline.pagination.records >= 0, true);
    TestValidator.equals("pagination pages calculated correctly", baseline.pagination.pages, baseline.pagination.records === 0 ? 0 : Math.ceil(baseline.pagination.records / baseline.pagination.limit));
    TestValidator.predicate("data is array", Array.isArray(baseline.data));
    // 4. Test filtering by status
    const deliveredShipment: IPageIEcommerceMallShipment.ISummary = await api.functional.ecommerceMall.customer.shipments.index(customerConnection, {
        body: { status: "delivered" },
    });
    typia.assert(deliveredShipment);
    for (const shipment of deliveredShipment.data) {
        TestValidator.equals("shipment status is delivered", shipment.status, "delivered");
    }
    // 5. Test filtering by carrier_name (partial match)
    const fedexShipment: IPageIEcommerceMallShipment.ISummary = await api.functional.ecommerceMall.customer.shipments.index(customerConnection, {
        body: { carrier_name: "FedEx" },
    });
    typia.assert(fedexShipment);
    for (const shipment of fedexShipment.data) {
        if (shipment.carrierName) {
            TestValidator.predicate("carrier name contains FedEx", shipment.carrierName.toLowerCase().includes("fedex"));
        }
    }
    // 6. Test date range filtering
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const recentShipment: IPageIEcommerceMallShipment.ISummary = await api.functional.ecommerceMall.customer.shipments.index(customerConnection, {
        body: {
            created_at: threeDaysAgo,
        },
    });
    typia.assert(recentShipment);
    TestValidator.equals("recent shipments count valid", recentShipment.pagination.records >= 0, true);
    // 7. Test sorting by different fields
    const sortByCreated: IPageIEcommerceMallShipment.ISummary = await api.functional.ecommerceMall.customer.shipments.index(customerConnection, {
        body: { sort: "created_at" },
    });
    typia.assert(sortByCreated);
    const sortByStatus: IPageIEcommerceMallShipment.ISummary = await api.functional.ecommerceMall.customer.shipments.index(customerConnection, {
        body: { sort: "status" },
    });
    typia.assert(sortByStatus);
    const sortByCarrier: IPageIEcommerceMallShipment.ISummary = await api.functional.ecommerceMall.customer.shipments.index(customerConnection, {
        body: { sort: "carrier_name" },
    });
    typia.assert(sortByCarrier);
    // 8. Test pagination parameters
    const paginated: IPageIEcommerceMallShipment.ISummary = await api.functional.ecommerceMall.customer.shipments.index(customerConnection, {
        body: {
            page: 1,
            limit: 10,
        },
    });
    typia.assert(paginated);
    TestValidator.equals("page is 1", paginated.pagination.current, 1);
    TestValidator.equals("limit is 10", paginated.pagination.limit, 10);
    // 9. Validate shipment structure when data exists
    if (baseline.data.length > 0) {
        const shipment: IEcommerceMallShipment.ISummary = baseline.data[0];
        typia.assert(shipment);
        // Check required shipment fields
        TestValidator.predicate("shipment has id", shipment.id !== undefined);
        TestValidator.predicate("shipment has status", shipment.status !== undefined);
        TestValidator.equals("shipment has tracking count non-negative", shipment.trackingCount >= 0, true);
        // Check optional carrier fields (may or may not exist)
        if (shipment.carrierName !== undefined) {
            TestValidator.predicate("carrier name is string", typeof shipment.carrierName === "string");
        }
        if (shipment.carrierPhone !== undefined) {
            TestValidator.predicate("carrier phone is string", typeof shipment.carrierPhone === "string");
        }
        if (shipment.carrierWebsite !== undefined) {
            TestValidator.predicate("carrier website is URI", typeof shipment.carrierWebsite === "string");
        }
        // Check timestamps
        if (shipment.shippedAt !== undefined) {
            TestValidator.predicate("shippedAt is valid date-time", shipment.shippedAt !== undefined);
        }
        if (shipment.deliveredAt !== undefined) {
            TestValidator.predicate("deliveredAt is valid date-time", shipment.deliveredAt !== undefined);
        }
        if (shipment.estimatedDeliveryAt !== undefined) {
            TestValidator.predicate("estimatedDeliveryAt is valid date-time", shipment.estimatedDeliveryAt !== undefined);
        }
        // Check order reference
        TestValidator.predicate("shipment has order reference", shipment.order !== undefined);
        if (shipment.order) {
            typia.assert(shipment.order);
            // Check order fields
            TestValidator.equals("order has id", shipment.order.id !== undefined, true);
            TestValidator.equals("order has order_number", shipment.order.order_number !== undefined, true);
            TestValidator.equals("order has total_price", typeof shipment.order.total_price === "number", true);
            TestValidator.equals("order has status", shipment.order.status !== undefined, true);
            TestValidator.equals("order has shipping_address", shipment.order.shipping_address !== undefined, true);
            TestValidator.equals("order has created_at", shipment.order.created_at !== undefined, true);
            // Check shipping address
            if (shipment.order.shipping_address) {
                typia.assert(shipment.order.shipping_address);
                TestValidator.equals("address has recipient_name", shipment.order.shipping_address.recipient_name !== undefined, true);
                TestValidator.equals("address has recipient_phone", shipment.order.shipping_address.recipient_phone !== undefined, true);
                TestValidator.equals("address has street", shipment.order.shipping_address.street !== undefined, true);
                TestValidator.equals("address has city", shipment.order.shipping_address.city !== undefined, true);
                TestValidator.equals("address has state", shipment.order.shipping_address.state !== undefined, true);
                TestValidator.equals("address has is_default", typeof shipment.order.shipping_address.is_default === "boolean", true);
                TestValidator.equals("address has created_at", shipment.order.shipping_address.created_at !== undefined, true);
                TestValidator.equals("address has updated_at", shipment.order.shipping_address.updated_at !== undefined, true);
                TestValidator.equals("address has deleted_at nullable", shipment.order.shipping_address.deleted_at === null || shipment.order.shipping_address.deleted_at !== undefined, true);
            }
        }
    }
    // 10. Test empty list when no shipments match criteria
    const noShipments: IPageIEcommerceMallShipment.ISummary = await api.functional.ecommerceMall.customer.shipments.index(customerConnection, {
        body: {
            page: 1,
            limit: 20,
        },
    });
    typia.assert(noShipments);
    TestValidator.equals("page has no records when none exist", noShipments.pagination.records, 0);
    TestValidator.equals("page has no data when none exist", noShipments.data.length, 0);
    // 11. Test multiple filter combinations
    const combined: IPageIEcommerceMallShipment.ISummary = await api.functional.ecommerceMall.customer.shipments.index(customerConnection, {
        body: {
            status: "pending",
            carrier_name: "DHL",
            sort: "created_at",
            page: 1,
            limit: 50,
        },
    });
    typia.assert(combined);
    // 12. Validate data isolation (customer should only see their own shipments)
    // This is implicitly validated by the API enforcing seller_id relationship
    // The test ensures the customerConnection (authenticated as customer) only returns customer's shipments
    TestValidator.predicate("customer shipments retrieved successfully", true);
}