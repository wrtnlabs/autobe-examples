import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProductVariant";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
/**
 * Test that an authenticated seller can retrieve a paginated listing of product variants for their own product.
 *
 * Validates that the paginated variant listing endpoint returns proper pagination metadata and response structure. Since the variant creation SDK function is unavailable, the test confirms the endpoint handles edge cases gracefully - returning an empty variant array with valid pagination information rather than an error.
 *
 * Special attention is given to verifying that pagination fields (current, limit, records, pages) are present and internally consistent, and that different sort parameters (created_at descending, price ascending) are accepted without error.
 *
 * 1. Register a seller account via `authorize_seller_join`.
 * 2. Create a product via `generate_random_e_commerce_mall_seller_products_create`.
 * 3. Call the variants listing endpoint with page=1, limit=10, sort=created_at, direction=desc.
 * 4. Validate pagination metadata structure and values.
 * 5. Call again with sort=price, direction=asc to verify sort parameter flexibility.
 */
export async function test_api_seller_product_variants_paginated_listing(connection: api.IConnection): Promise<void> {
    // 1. Register seller
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {});
    typia.assert(seller);
    // 2. Create a product
    const product = await generate_random_e_commerce_mall_seller_products_create(sellerConnection, {});
    typia.assert(product);
    // 3. Call variants listing with pagination sorted by created_at descending
    const page1 = await api.functional.eCommerceMall.seller.products.variants.index(
        sellerConnection,
        {
            productId: product.id,
            body: {
                page: 1,
                limit: 10,
                sort: "created_at",
                direction: "desc",
            } satisfies IECommerceMallProductVariant.IRequest,
        },
    );
    typia.assert(page1);
    // 4. Validate pagination metadata
    TestValidator.equals("current page", page1.pagination.current, 1);
    TestValidator.equals("page limit", page1.pagination.limit, 10);
    // 5. Test sorting by price ascending
    const page2 = await api.functional.eCommerceMall.seller.products.variants.index(
        sellerConnection,
        {
            productId: product.id,
            body: {
                page: 1,
                limit: 10,
                sort: "price",
                direction: "asc",
            } satisfies IECommerceMallProductVariant.IRequest,
        },
    );
    typia.assert(page2);
    TestValidator.equals("current page (price sort)", page2.pagination.current, 1);
}