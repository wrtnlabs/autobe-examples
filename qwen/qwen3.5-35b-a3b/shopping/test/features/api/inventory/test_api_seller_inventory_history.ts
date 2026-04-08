import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_inventory_history(connection: api.IConnection): Promise<void> {
    // 1. Register seller account
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(2),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallSeller.IJoin,
    });
    typia.assert(sellerAuth);
    // 2. Generate test product and variant IDs
    // Note: Product/variant creation is handled outside this test or via other endpoints
    const productId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    const variantId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    // 3. Call inventory history endpoint with default pagination
    const historyResponse: IPageIEcommerceMallInventoryRecord.ISummary = await api.functional.ecommerceMall.seller.products.variants.inventory.history.index(sellerConnection, {
        productId,
        variantId,
        body: {
            search: null,
            limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>>(),
            page: 1,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
    });
    typia.assert(historyResponse);
    // 4. Validate response structure
    typia.assert(historyResponse.pagination);
    typia.assert(Array.isArray(historyResponse.data));
    // 5. Validate pagination metadata
    const pagination = historyResponse.pagination;
    TestValidator.equals("pagination current page", pagination.current, 1);
    TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
    TestValidator.predicate("pagination records is non-negative", pagination.records >= 0);
    TestValidator.predicate("pagination pages is non-negative", pagination.pages >= 0);
    // Validate pages calculation: ceil(records / limit)
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals("pagination pages calculation", pagination.pages, expectedPages);
    // 6. Validate each inventory record structure using typia.assert
    for (let i = 0; i < historyResponse.data.length; i++) {
        const record = historyResponse.data[i];
        typia.assert(record);
        // Validate record structure fields exist and have correct types
        TestValidator.predicate(`record ${i} id is UUID string`, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(record.id));
        TestValidator.predicate(`record ${i} quantity_change is integer`, Number.isInteger(record.quantity_change));
        TestValidator.predicate(`record ${i} operation_type is string`, typeof record.operation_type === "string" && record.operation_type.length > 0);
        TestValidator.predicate(`record ${i} created_at is ISO date-time`, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})$/.test(record.created_at));
        // Validate reference_id is UUID or null
        if (record.reference_id !== null) {
            TestValidator.predicate(`record ${i} reference_id is UUID string`, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(record.reference_id));
        }
        // Validate productVariant reference
        typia.assert(record.productVariant);
        TestValidator.equals(`record ${i} productVariant id is UUID`, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(record.productVariant.id), true);
    }
    // 7. Validate chronological order (newest first by created_at)
    if (historyResponse.data.length > 1) {
        for (let i = 0; i < historyResponse.data.length - 1; i++) {
            const current = historyResponse.data[i];
            const next = historyResponse.data[i + 1];
            const currentTs = new Date(current.created_at).getTime();
            const nextTs = new Date(next.created_at).getTime();
            TestValidator.predicate(`record ${i} is newer than or equal to ${i + 1}`, currentTs >= nextTs);
        }
    }
    // 8. Validate running total calculation (quantity_change sums should make sense)
    let runningTotal: number = 0;
    for (let i = 0; i < historyResponse.data.length; i++) {
        const record = historyResponse.data[i];
        runningTotal += record.quantity_change;
        // Running total should always be non-negative (stock can't be negative)
        TestValidator.predicate(`running total after record ${i} is non-negative`, runningTotal >= 0);
    }
    // 9. Test filtering by operation type (RESTOCK only)
    const restockOnlyHistory: IPageIEcommerceMallInventoryRecord.ISummary = await api.functional.ecommerceMall.seller.products.variants.inventory.history.index(sellerConnection, {
        productId,
        variantId,
        body: {
            search: null,
            operationType: "RESTOCK",
            limit: 100,
            page: 1,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
    });
    typia.assert(restockOnlyHistory);
    if (restockOnlyHistory.data.length > 0) {
        for (const record of restockOnlyHistory.data) {
            TestValidator.equals("RESTOCK filter returns only RESTOCK records", record.operation_type, "RESTOCK");
        }
    }
    // 10. Test filtering by negative quantity direction
    const negativeHistory: IPageIEcommerceMallInventoryRecord.ISummary = await api.functional.ecommerceMall.seller.products.variants.inventory.history.index(sellerConnection, {
        productId,
        variantId,
        body: {
            search: null,
            minQuantity: -999999,
            maxQuantity: -1,
            limit: 100,
            page: 1,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
    });
    typia.assert(negativeHistory);
    if (negativeHistory.data.length > 0) {
        for (const record of negativeHistory.data) {
            TestValidator.predicate("Negative quantity filter returns only negative changes", record.quantity_change < 0);
        }
    }
    // 11. Test pagination with second page if available
    if (pagination.records > pagination.limit && pagination.pages > 1) {
        const secondPageHistory: IPageIEcommerceMallInventoryRecord.ISummary = await api.functional.ecommerceMall.seller.products.variants.inventory.history.index(sellerConnection, {
            productId,
            variantId,
            body: {
                search: null,
                limit: pagination.limit,
                page: 2,
            } satisfies IEcommerceMallInventoryRecord.IRequest,
        });
        typia.assert(secondPageHistory);
        TestValidator.equals("second page current page", secondPageHistory.pagination.current, 2);
        TestValidator.equals("second page is different from first", secondPageHistory.data.length !== historyResponse.data.length, true);
    }
    // 12. Test with empty search (null search parameter)
    const emptySearchHistory: IPageIEcommerceMallInventoryRecord.ISummary = await api.functional.ecommerceMall.seller.products.variants.inventory.history.index(sellerConnection, {
        productId,
        variantId,
        body: {
            search: null,
            limit: 10,
            page: 1,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
    });
    typia.assert(emptySearchHistory);
    // 13. Test with search parameter
    const searchHistory: IPageIEcommerceMallInventoryRecord.ISummary = await api.functional.ecommerceMall.seller.products.variants.inventory.history.index(sellerConnection, {
        productId,
        variantId,
        body: {
            search: "test",
            limit: 100,
            page: 1,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
    });
    typia.assert(searchHistory);
    TestValidator.equals("search history has data array", Array.isArray(searchHistory.data), true);
}