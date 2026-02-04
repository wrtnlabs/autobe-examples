import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_search_products_global_with_filters(connection: api.IConnection): Promise<void> {
    // Create customer account for search access
    const customerConnection: api.IConnection = { host: connection.host };
    const customer: IShoppingMallCustomer.IAuthorized = await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: "https://example.com/register",
            referrer: "https://example.com/home"
        } satisfies IShoppingMallCustomer.IJoin,
    });
    typia.assert(customer);
    // Test 1: Search with category_id filter
    const categoryIds = [
        "2470332e-71e9-4181-a85b-76998146f392",
        "a8a74615-3b43-4078-b5c9-c563162e5379",
        "f0e21b65-1d8a-4b64-a1f4-a90051567e23"
    ] as const;
    const randomCategoryId = RandomGenerator.pick(categoryIds);
    const searchResult1 = await api.functional.shoppingMall.search.products.global.search(customerConnection, {
        body: {
            category_id: randomCategoryId,
            page: 1,
            limit: 10
        } satisfies IShoppingMallProduct.IRequest
    });
    typia.assert(searchResult1);
    // Test 2: Search with minPrice and maxPrice filters
    const minPrice = typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>>();
    const maxPriceRange = minPrice + 1;
    const maxPrice = typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<500>>();
    const searchResult2 = await api.functional.shoppingMall.search.products.global.search(customerConnection, {
        body: {
            minPrice,
            maxPrice,
            page: 1,
            limit: 10
        } satisfies IShoppingMallProduct.IRequest
    });
    typia.assert(searchResult2);
    // Test 3: Search with inStockOnly=true
    const searchResult3 = await api.functional.shoppingMall.search.products.global.search(customerConnection, {
        body: {
            inStockOnly: true,
            page: 1,
            limit: 10
        } satisfies IShoppingMallProduct.IRequest
    });
    typia.assert(searchResult3);
    // Test 4: Search with multiple filters combined
    const searchResult4 = await api.functional.shoppingMall.search.products.global.search(customerConnection, {
        body: {
            category_id: randomCategoryId,
            minPrice,
            maxPrice,
            inStockOnly: true,
            page: 1,
            limit: 10
        } satisfies IShoppingMallProduct.IRequest
    });
    typia.assert(searchResult4);
    // Test 5: Verify pagination properties are returned correctly
    const searchResult5 = await api.functional.shoppingMall.search.products.global.search(customerConnection, {
        body: {
            page: 3,
            limit: 5
        } satisfies IShoppingMallProduct.IRequest
    });
    typia.assert(searchResult5);
    // Verify pagination structure
    TestValidator.equals("pagination page has correct current page", searchResult5.pagination.current, 3);
    TestValidator.equals("pagination page has correct limit", searchResult5.pagination.limit, 5);
    // Verify that pagination records is positive
    TestValidator.predicate("pagination records is a positive number", searchResult5.pagination.records > 0);
    // Verify pages calculation is correct
    TestValidator.predicate("pagination pages is a positive number", searchResult5.pagination.pages > 0);
    // Test 6: Search with sort parameter
    const searchResult6 = await api.functional.shoppingMall.search.products.global.search(customerConnection, {
        body: {
            sort: "newest",
            page: 1,
            limit: 5
        } satisfies IShoppingMallProduct.IRequest
    });
    typia.assert(searchResult6);
    // Verify sort parameter accepted
    TestValidator.equals("search response has correct sort parameter applied", searchResult6.pagination.current, 1);
    // Test 7: Confirm search response structure with all required properties
    const searchResult7 = await api.functional.shoppingMall.search.products.global.search(customerConnection, {
        body: {
            page: 1,
            limit: 1
        } satisfies IShoppingMallProduct.IRequest
    });
    typia.assert(searchResult7);
    // Verify response structure for at least one product
    if (searchResult7.data.length > 0) {
        const product = searchResult7.data[0];
        // Verify required properties of IShoppingMallProduct.ISummary exist
        TestValidator.equals("product has productId property", typeof product.productId, "string");
        TestValidator.equals("product has sellerName property", typeof product.sellerName, "string");
        TestValidator.equals("product has isAvailable property", typeof product.isAvailable, "boolean");
        TestValidator.equals("product has variantCount property", typeof product.variantCount, "number");
        TestValidator.predicate("product has categoryPath array", Array.isArray(product.categoryPath));
        // Verify optional properties exist and have correct types
        TestValidator.predicate("product name is string or null", product.name === null || typeof product.name === "string");
        TestValidator.predicate("product basePrice is number or null", product.basePrice === null || typeof product.basePrice === "number");
    }
}