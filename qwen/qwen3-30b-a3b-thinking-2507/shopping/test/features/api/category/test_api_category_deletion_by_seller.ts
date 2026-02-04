import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_product_category } from "../../../prepare/prepare_random_shopping_mall_product_category";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_category_deletion_by_seller(connection: api.IConnection) {
    const sellerConnection: api.IConnection = { host: connection.host };
    
    // Login as seller to get authentication
    await authorize_seller_join(sellerConnection, { body: {} });
    
    // Create a new category for testing
    const categoryName = RandomGenerator.paragraph({ sentences: 1 });
    const category = await api.functional.shoppingMall.seller.categories.create(sellerConnection, {
        body: {
            name: categoryName,
        }
    });
    
    typia.assert(category);
    
    // Delete the created category
    const deletedCategory = await api.functional.shoppingMall.seller.categories.erase(sellerConnection, {
        categoryId: category.id,
    });
    
    typia.assert(deletedCategory);
    
    // Verify the category id matches
    TestValidator.equals('deleted category id matches created category id', deletedCategory.id, category.id);
}