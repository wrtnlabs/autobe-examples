import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
export async function test_api_product_search_by_name_category(connection: api.IConnection): Promise<void> {
    // Step 1: Perform search by default (with empty search parameters)
    const searchResult = await api.functional.shoppingMall.products.index(connection, {
        body: {} satisfies IShoppingMallProduct.IRequest,
    });
    typia.assert<IShoppingMallProduct.ISummary[]>(searchResult.data);
    typia.assert(searchResult.pagination);
    // Step 2: Verify active products are returned by default
    const activeProducts = searchResult.data.filter(p => p.status === 'active');
    TestValidator.notEquals('should default to active products', activeProducts.length, 0);
    TestValidator.notEquals('should have active products', searchResult.data.length, 0);
    // Step 3: Verify product category information is included in results
    const productWithCategory = searchResult.data.find(p => p.category);
    TestValidator.notEquals('should include category information', productWithCategory, undefined);
    // Step 4: Verify category hierarchy information is correct
    TestValidator.notEquals('category ID should exist', productWithCategory!.category.id, undefined);
    TestValidator.notEquals('category name should exist', productWithCategory!.category.name, '');
    // Step 5: Verify pagination data is correctly structured
    TestValidator.notEquals('pagination should have records', searchResult.pagination.records, 0);
    TestValidator.equals('pagination current should be 1', searchResult.pagination.current, 1);
    TestValidator.equals('pagination limit should be at least 1', searchResult.pagination.limit, 10);
    // Step 6: Verify business rule - active products are default
    TestValidator.predicate('default behavior should filter active products', activeProducts.length === searchResult.data.length);
}