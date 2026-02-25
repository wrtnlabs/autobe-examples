import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductVariant";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_product_variants_stock_availability(connection: api.IConnection): Promise<void> {
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
        },
    });
    const product = await generate_random_ecommerce_seller_products_create(sellerConnection, {});
    const variantsResponse = await api.functional.ecommerce.seller.products.variants.index(sellerConnection, {
        productId: product.id,
        body: {
            page: 1,
            limit: 10,
            price_min: 0.01,
        },
    });
    typia.assert(variantsResponse);
    for (const variant of variantsResponse.data) {
        TestValidator.predicate(
            `variant ${variant.id} should have price >= 0.01`,
            variant.price != null && variant.price >= 0.01
        );
    }
}