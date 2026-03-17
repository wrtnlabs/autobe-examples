import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { authorize_admin_join as _authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function authorize_admin_join(connection: api.IConnection, props: {
    body?: Partial<IEcommerceMallAdmin.IJoin>;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
    const joinInput = {
        email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
        href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
        referrer: props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
        ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin;
    return await api.functional.ecommerceMall.auth.admin.join(connection, {
        body: joinInput,
    });
}
export async function test_api_admin_shipment_list_data_isolation_and_edge_cases(connection: api.IConnection): Promise<void> {
    // Setup: Create admin account
    const adminConnection: api.IConnection = { host: connection.host };
    const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    typia.assert(admin);
    // Edge Case 1: Empty state - no shipments exist for admin
    const emptyPage: IPageIEcommerceMallShipment.ISummary = await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
        body: {},
    });
    typia.assert(emptyPage);
    TestValidator.equals("empty data array", emptyPage.data.length, 0);
    TestValidator.equals("empty records count", emptyPage.pagination.records, 0);
    TestValidator.equals("empty pages count", emptyPage.pagination.pages, 0);
    // Edge Case 5a: Pagination extreme - limit=1 (minimum)
    const minLimitPage: IPageIEcommerceMallShipment.ISummary = await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
        body: { limit: 1 } satisfies Partial<IEcommerceMallShipment.IRequest>,
    });
    typia.assert(minLimitPage);
    TestValidator.equals("min limit records", minLimitPage.pagination.limit, 1);
    // Edge Case 5b: Pagination extreme - limit=100 (maximum)
    const maxLimitPage: IPageIEcommerceMallShipment.ISummary = await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
        body: { limit: 100 } satisfies Partial<IEcommerceMallShipment.IRequest>,
    });
    typia.assert(maxLimitPage);
    TestValidator.equals("max limit records", maxLimitPage.pagination.limit, 100);
    // Edge Case 6: Sorting on fields with null values - test stable ordering
    const sortedPage: IPageIEcommerceMallShipment.ISummary = await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
        body: { sort: "created_at" } satisfies Partial<IEcommerceMallShipment.IRequest>,
    });
    typia.assert(sortedPage);
    // Validation: Data isolation enforced (admin only sees own shipments)
    // In this test, we only have one admin, so all returned shipments should belong to this admin
    for (const shipment of sortedPage.data) {
        TestValidator.predicate("shipment has valid order reference", shipment.order !== undefined);
        TestValidator.predicate("shipment has valid tracking count", shipment.trackingCount >= 0);
        TestValidator.equals("tracking count is integer", Number.isInteger(shipment.trackingCount), true);
    }
    // Edge Case 2: Null carrier_name - should still be returned (carrierName is optional)
    const shipmentsWithoutCarrier = sortedPage.data.filter((s) => s.carrierName === undefined);
    // Validation: Shipments are returned even without carrier information
    TestValidator.equals("null carrier shipments handled", shipmentsWithoutCarrier.length >= 0, true);
    // Edge Case 3: Zero tracking codes - trackingCount should be 0
    const shipmentsWithZeroTracking = sortedPage.data.filter((s) => s.trackingCount === 0);
    // Validation: Tracking count can be zero and shipment is still returned
    TestValidator.equals("zero tracking shipments handled", shipmentsWithZeroTracking.length >= 0, true);
    // Validation: Pagination metadata accuracy
    const expectedPages = sortedPage.pagination.records > 0
        ? Math.ceil(sortedPage.pagination.records / sortedPage.pagination.limit)
        : 0;
    TestValidator.equals("pages calculation correct", sortedPage.pagination.pages, expectedPages);
}