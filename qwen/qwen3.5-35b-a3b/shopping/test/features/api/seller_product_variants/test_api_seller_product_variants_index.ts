import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_product_variants_index(connection: api.IConnection): Promise<void> {
    // 1. Seller authentication
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(sellerAuth);
    // 2. Create product for the seller
    const sellerProductConnection: api.IConnection = { host: connection.host };
    const product = await generate_random_ecommerce_mall_seller_products_create(sellerProductConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            category_id: typia.random<string & tags.Format<"uuid">>(),
            base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
        } satisfies IEcommerceMallProduct.ICreate,
    });
    typia.assert(product);
    // 3. Create multiple variants for the product
    const variantsData = ArrayUtil.repeat(3, (index) => ({
        sku: `SKU-${RandomGenerator.alphaNumeric(8)}-${index}`,
        options: {
            size: ["Small", "Medium", "Large"][index % 3],
            color: ["Red", "Blue", "Black"][index % 3],
        },
        base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>() + index * 1000,
        sale_price: index === 1 ? typia.random<number>() : null,
        stock_quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        sort_order: index,
        is_default: index === 0,
    })) satisfies DeepPartial<IEcommerceMallProductVariant.ICreate>[];
    const createdVariants: IEcommerceMallProductVariant[] = [];
    for (const variantData of variantsData) {
        const variant = await generate_random_ecommerce_mall_seller_products_variants_create(sellerProductConnection, {
            params: { productId: product.id },
            body: variantData,
        });
        typia.assert(variant);
        createdVariants.push(variant);
    }
    // 4. Retrieve variants with pagination
    const pageRequest: IEcommerceMallProductVariant.IRequest = {
        page: 1,
        limit: 10,
    };
    const paginatedResponse: IPageIEcommerceMallProductVariant.ISummary = await api.functional.ecommerceMall.seller.products.variants.index(sellerProductConnection, {
        productId: product.id,
        body: pageRequest,
    });
    typia.assert(paginatedResponse);
    // 5. Validate pagination metadata
    TestValidator.equals("pagination current page", paginatedResponse.pagination.current, 1);
    TestValidator.equals("pagination limit", paginatedResponse.pagination.limit, 10);
    TestValidator.equals("pagination records count", paginatedResponse.pagination.records, 3);
    TestValidator.equals("pagination total pages", paginatedResponse.pagination.pages, 1);
    // 6. Validate variants data
    TestValidator.equals("variants count in data", paginatedResponse.data.length, 3);
    // 7. Validate each variant has required fields
    for (const variant of paginatedResponse.data) {
        typia.assert(variant);
        // Validate variant fields
        TestValidator.predicate("variant has valid id", variant.id !== undefined);
        TestValidator.predicate("variant has SKU", variant.sku.length > 0);
        TestValidator.equals("variant options is object", typeof variant.options, "object");
        TestValidator.predicate("variant has positive base price", variant.basePrice > 0);
        TestValidator.predicate("variant sale price is number or null", variant.salePrice === null || typeof variant.salePrice === "number");
        TestValidator.predicate("variant has non-negative stock quantity", variant.stockQuantity >= 0);
        TestValidator.predicate("variant has non-negative reserved quantity", variant.reservedQuantity >= 0);
        TestValidator.predicate("variant has status", variant.status.length > 0);
        TestValidator.predicate("variant has valid sort order", variant.sortOrder >= 0);
        TestValidator.predicate("variant has isDefault boolean", typeof variant.isDefault === "boolean");
        TestValidator.equals("variant has product reference", variant.product.id !== undefined, true);
        TestValidator.equals("variant has created_at", variant.createdAt !== undefined, true);
        TestValidator.equals("variant has updated_at", variant.updatedAt !== undefined, true);
        TestValidator.equals("variant deleted_at is null", variant.deletedAt === null, true);
    }
}