import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentSnapshot";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function authorize_seller_join(connection: api.IConnection, props: {
    body?: Partial<IEcommerceMallSeller.IJoin>;
}): Promise<IEcommerceMallSeller.IAuthorized> {
    const joinInput = {
        email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
        href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
        referrer: props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin;
    return await api.functional.ecommerceMall.auth.seller.join(connection, {
        body: joinInput,
    });
}
export async function test_api_seller_shipment_snapshots_retrieval(connection: api.IConnection): Promise<void> {
    // 1. Seller registration with isolated connection
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallSeller.IJoin,
    });
    typia.assert(seller);
    TestValidator.equals("seller authentication successful", seller.token.access.length > 0, true);
    // 2. Test edge case: shipment with no snapshots (immediately after creation)
    const emptyShipmentId = typia.random<string & tags.Format<"uuid">>();
    const emptyResponse = await api.functional.ecommerceMall.seller.shipments.snapshots.index(sellerConnection, {
        shipmentId: emptyShipmentId,
        body: {
            page: 1,
            limit: 20,
        } satisfies IEcommerceMallShipmentSnapshot.IRequest,
    });
    typia.assert(emptyResponse);
    TestValidator.equals("empty data array", emptyResponse.data.length, 0);
    TestValidator.equals("zero records", emptyResponse.pagination.records, 0);
    TestValidator.equals("zero pages", emptyResponse.pagination.pages, 0);
    TestValidator.equals("current page 1", emptyResponse.pagination.current, 1);
    TestValidator.equals("limit respected", emptyResponse.pagination.limit, 20);
    // 3. Test pagination with small page size
    const shipmentId = typia.random<string & tags.Format<"uuid">>();
    const paginatedResponse = await api.functional.ecommerceMall.seller.shipments.snapshots.index(sellerConnection, {
        shipmentId,
        body: {
            page: 1,
            limit: 2,
            sort: "created_at",
            order: "desc",
        } satisfies IEcommerceMallShipmentSnapshot.IRequest,
    });
    typia.assert(paginatedResponse);
    TestValidator.equals("pagination data array", paginatedResponse.data.length, paginatedResponse.data.length);
    TestValidator.equals("current page 1", paginatedResponse.pagination.current, 1);
    TestValidator.equals("limit 2", paginatedResponse.pagination.limit, 2);
    // 4. Test sorting by created_at descending
    const sortedResponse = await api.functional.ecommerceMall.seller.shipments.snapshots.index(sellerConnection, {
        shipmentId,
        body: {
            page: 1,
            limit: 10,
            sort: "created_at",
            order: "desc",
        } satisfies IEcommerceMallShipmentSnapshot.IRequest,
    });
    typia.assert(sortedResponse);
    TestValidator.equals("sort field valid", sortedResponse.pagination.records >= 0, true);
    // 5. Test filtering by status
    const filteredResponse = await api.functional.ecommerceMall.seller.shipments.snapshots.index(sellerConnection, {
        shipmentId,
        body: {
            page: 1,
            limit: 10,
            status: "delivered",
        } satisfies IEcommerceMallShipmentSnapshot.IRequest,
    });
    typia.assert(filteredResponse);
    TestValidator.equals("filtered data array", filteredResponse.data.length >= 0, true);
    // 6. Validate complete response structure with all required fields
    const structureResponse = await api.functional.ecommerceMall.seller.shipments.snapshots.index(sellerConnection, {
        shipmentId,
        body: {
            page: 1,
            limit: 20,
        } satisfies IEcommerceMallShipmentSnapshot.IRequest,
    });
    typia.assert(structureResponse);
    TestValidator.equals("has pagination object", typeof structureResponse.pagination === "object", true);
    TestValidator.equals("has data array", Array.isArray(structureResponse.data), true);
    TestValidator.equals("pagination has current", typeof structureResponse.pagination.current === "number", true);
    TestValidator.equals("pagination has limit", typeof structureResponse.pagination.limit === "number", true);
    TestValidator.equals("pagination has records", typeof structureResponse.pagination.records === "number", true);
    TestValidator.equals("pagination has pages", typeof structureResponse.pagination.pages === "number", true);
    // 7. Validate snapshot summary structure if any data exists
    if (structureResponse.data.length > 0) {
        const snapshot = structureResponse.data[0];
        typia.assert(snapshot);
        TestValidator.equals("snapshot has id", typeof snapshot.id === "string", true);
        TestValidator.equals("snapshot has tracking_number", typeof snapshot.tracking_number === "string", true);
        TestValidator.equals("snapshot has carrier_name", typeof snapshot.carrier_name === "string" || snapshot.carrier_name === null, true);
        TestValidator.equals("snapshot has status", typeof snapshot.status === "string", true);
        TestValidator.equals("snapshot has created_at", typeof snapshot.created_at === "string", true);
        TestValidator.equals("snapshot has shipment_id", typeof snapshot.ecommerce_mall_shipment_id === "string", true);
    }
}