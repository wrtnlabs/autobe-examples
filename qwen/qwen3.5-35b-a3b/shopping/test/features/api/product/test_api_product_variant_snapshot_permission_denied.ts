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
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_product_variant_snapshot_permission_denied(connection: api.IConnection): Promise<void> {
    // 1. Seller A registration
    const sellerAConnection: api.IConnection = { host: connection.host };
    const sellerAAuth = await api.functional.ecommerceMall.auth.seller.join(sellerAConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(2),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(sellerAAuth);
    // 2. Seller B registration
    const sellerBConnection: api.IConnection = { host: connection.host };
    const sellerBAuth = await api.functional.ecommerceMall.auth.seller.join(sellerBConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(2),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(sellerBAuth);
    // 3. Seller A creates a product (approval_status must be 'approved' - this is a test edge case)
    // Since we cannot bypass approval status, we simulate the scenario where both sellers are approved
    const productA = await api.functional.ecommerceMall.seller.products.create(sellerAConnection, {
        body: {
            name: `Product A - ${RandomGenerator.name(2)}`,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            category_id: typia.random<string & tags.Format<"uuid">>(),
            base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
        } satisfies IEcommerceMallProduct.ICreate,
    });
    typia.assert(productA);
    // 4. Seller A creates and updates a variant to create snapshot
    const variantA = await api.functional.ecommerceMall.seller.products.variants.update(sellerAConnection, {
        productId: productA.id,
        variantId: typia.random<string & tags.Format<"uuid">>(),
        body: {
            sku_code: `SKU-A-${RandomGenerator.alphaNumeric(8)}`,
            option_values: { color: "red", size: "L" },
            stock_quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        } satisfies IEcommerceMallProductVariant.IUpdate,
    });
    typia.assert(variantA);
    // Edit variant to create snapshot
    const updatedVariantA = await api.functional.ecommerceMall.seller.products.variants.update(sellerAConnection, {
        productId: productA.id,
        variantId: variantA.id,
        body: {
            stock_quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        } satisfies IEcommerceMallProductVariant.IUpdate,
    });
    typia.assert(updatedVariantA);
    // 5. Seller B attempts to access seller A's variant snapshots - should fail with 403
    await TestValidator.error("seller B cannot access seller A's variant snapshots", async () => {
        await api.functional.ecommerceMall.seller.products.variants.snapshots.index(sellerBConnection, {
            productId: productA.id,
            variantId: variantA.id,
            body: {},
        });
    });
}