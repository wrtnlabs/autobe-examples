import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariantOption";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItemSnapshotVariantOption";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_order_item_snapshot_variant_options_pagination_and_filtering(connection: api.IConnection): Promise<void> {
    // 1. Create and authenticate seller account
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceSeller.IJoin,
    });
    typia.assert(seller);
    // 2. Create a product with variants containing multiple options
    const product = await generate_random_ecommerce_seller_products_create(sellerConnection, {
        body: {
            name: RandomGenerator.name(3),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            category_id: typia.random<string & tags.Format<"uuid">>(),
            base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
            variants: ArrayUtil.repeat(3, () => ({
                sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
                option_values: [
                    `color=${RandomGenerator.alphabets(5)}`,
                    `size=${RandomGenerator.pick(["S", "M", "L", "XL"])}`,
                    `material=${RandomGenerator.alphabets(6)}`,
                ].join(";"),
                price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
            }))
        } satisfies IEcommerceProduct.ICreate,
    });
    typia.assert(product);
    // 3. Test pagination with default parameters
    const orderId = typia.random<string & tags.Format<"uuid">>();
    const itemId = typia.random<string & tags.Format<"uuid">>();
    const page1 = await api.functional.ecommerce.seller.orders.items.snapshot.variant.options.index(sellerConnection, {
        orderId,
        itemId,
        body: {
            page: 1,
            limit: 10,
        } satisfies IEcommerceOrderItemSnapshotVariantOption.IRequest,
    });
    typia.assert(page1);
    // Validate pagination metadata structure
    TestValidator.predicate("pagination has current page", page1.pagination.current >= 0);
    TestValidator.predicate("pagination has limit", page1.pagination.limit >= 0);
    TestValidator.predicate("pagination has records", page1.pagination.records >= 0);
    TestValidator.predicate("pagination has pages", page1.pagination.pages >= 0);
    // 4. Test pagination with larger limit (enforce max 100)
    const pageLarge = await api.functional.ecommerce.seller.orders.items.snapshot.variant.options.index(sellerConnection, {
        orderId,
        itemId,
        body: {
            page: 1,
            limit: 100,
        } satisfies IEcommerceOrderItemSnapshotVariantOption.IRequest,
    });
    typia.assert(pageLarge);
    TestValidator.predicate("limit respects maximum", pageLarge.pagination.limit <= 100);
    // 5. Test filtering by option key
    const filteredByColor = await api.functional.ecommerce.seller.orders.items.snapshot.variant.options.index(sellerConnection, {
        orderId,
        itemId,
        body: {
            key: "color",
            page: 1,
            limit: 50,
        } satisfies IEcommerceOrderItemSnapshotVariantOption.IRequest,
    });
    typia.assert(filteredByColor);
    // Validate all returned options have the filtered key
    for (const option of filteredByColor.data) {
        TestValidator.equals("filtered option key matches", option.key, "color");
    }
    // 6. Test filtering by different key (size)
    const filteredBySize = await api.functional.ecommerce.seller.orders.items.snapshot.variant.options.index(sellerConnection, {
        orderId,
        itemId,
        body: {
            key: "size",
            page: 1,
            limit: 50,
        } satisfies IEcommerceOrderItemSnapshotVariantOption.IRequest,
    });
    typia.assert(filteredBySize);
    for (const option of filteredBySize.data) {
        TestValidator.equals("filtered option key matches", option.key, "size");
    }
    // 7. Test offset-based pagination
    const pageWithOffset = await api.functional.ecommerce.seller.orders.items.snapshot.variant.options.index(sellerConnection, {
        orderId,
        itemId,
        body: {
            offset: 0,
            limit: 20,
        } satisfies IEcommerceOrderItemSnapshotVariantOption.IRequest,
    });
    typia.assert(pageWithOffset);
    // 8. Validate response data structure
    for (const option of page1.data) {
        TestValidator.predicate("option has id", option.id.length > 0);
        TestValidator.predicate("option has key", option.key.length > 0);
        TestValidator.predicate("option has value", option.value.length > 0);
        TestValidator.predicate("option has created_at", option.created_at.length > 0);
        TestValidator.predicate("option has updated_at", option.updated_at.length > 0);
    }
    // 9. Test empty result set pagination
    const emptyPage = await api.functional.ecommerce.seller.orders.items.snapshot.variant.options.index(sellerConnection, {
        orderId,
        itemId,
        body: {
            page: 999,
            limit: 10,
        } satisfies IEcommerceOrderItemSnapshotVariantOption.IRequest,
    });
    typia.assert(emptyPage);
    TestValidator.equals("empty page has zero records", emptyPage.pagination.records, emptyPage.data.length);
}