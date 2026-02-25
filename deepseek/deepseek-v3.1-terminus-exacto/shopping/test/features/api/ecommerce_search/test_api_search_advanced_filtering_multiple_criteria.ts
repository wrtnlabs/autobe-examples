import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
export async function test_api_search_advanced_filtering_multiple_criteria(connection: api.IConnection): Promise<void> {
    // Create search request with advanced filtering criteria
    const searchRequest: IEcommerceProduct.IRequest = {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        price_min: 50 satisfies number as number,
        price_max: 200 satisfies number as number,
        in_stock: true,
        sort_by: "price_low",
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1> as number,
        limit: 20 satisfies number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100> as number,
    };
    // Execute search with advanced filtering
    const searchResult = await api.functional.ecommerce.search(connection, {
        body: searchRequest,
    });
    typia.assert(searchResult);
    // Validate pagination structure
    TestValidator.equals("pagination structure exists", typeof searchResult.pagination, "object");
    TestValidator.predicate("has valid pagination", () => searchResult.pagination.current > 0 &&
        searchResult.pagination.limit > 0 &&
        searchResult.pagination.records >= 0 &&
        searchResult.pagination.pages >= 0);
    // Validate data array exists
    TestValidator.predicate("has data array", () => Array.isArray(searchResult.data));
    // If products found, validate filter criteria
    if (searchResult.data.length > 0) {
        // Verify all products meet filter criteria
        searchResult.data.forEach((product, index) => {
            // Check category matches
            TestValidator.equals(`product ${index} has matching category`, product.category.id, searchRequest.category_id);
            // Check price range
            TestValidator.predicate(`product ${index} price within range`, () => 
                product.base_price >= (searchRequest.price_min ?? 0) && 
                product.base_price <= (searchRequest.price_max ?? Infinity)
            );
            
            // Products should have valid IDs and names
            TestValidator.predicate(`product ${index} has valid ID`, () => !!product.id && product.id.length > 0);
            TestValidator.predicate(`product ${index} has valid name`, () => 
                !!product.name && product.name.length > 0
            );
            
            // Check seller information
            TestValidator.predicate(`product ${index} has valid seller`, () => !!product.seller && !!product.seller.id && !!product.seller.shop_name);
        });
        // Verify price sorting (ascending order)
        for (let i = 1; i < searchResult.data.length; i++) {
            TestValidator.predicate("products sorted by ascending price", () => searchResult.data[i - 1].base_price <= searchResult.data[i].base_price);
        }
    }
    // Validate response schema matches expected structure
    TestValidator.predicate("response has correct schema", () => searchResult.data.every(product => typeof product.id === 'string' &&
        typeof product.name === 'string' &&
        typeof product.base_price === 'number' &&
        typeof product.seller === 'object' &&
        typeof product.category === 'object'));
}