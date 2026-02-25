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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_product_update_success(connection: api.IConnection): Promise<void> {
    // 1. Auth as seller
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "1234",
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceSeller.IJoin,
    });
    // 2. Prepare test data
    const productId = typia.random<string & tags.Format<"uuid">>();
    const name = RandomGenerator.paragraph({ sentences: 2 });
    const description = RandomGenerator.paragraph({ sentences: 5 });
    const base_price = typia.random<number & tags.Minimum<0.01> & tags.Maximum<1000>>();
    const category_id = typia.random<string & tags.Format<"uuid">>();
    // 3. Update product
    const updatedProduct = await api.functional.ecommerce.seller.products.update(sellerConnection, {
        productId,
        body: {
            name,
            description,
            base_price,
            category_id,
        } satisfies IEcommerceProduct.IUpdate,
    });
    typia.assert(updatedProduct);
    // 4. Validate
    TestValidator.equals("name matches", updatedProduct.name, name);
    TestValidator.equals("description matches", updatedProduct.description, description);
    TestValidator.predicate("base_price > $0.01", updatedProduct.base_price > 0.01);
    TestValidator.equals("category_id matches", updatedProduct.category.id, category_id);
}