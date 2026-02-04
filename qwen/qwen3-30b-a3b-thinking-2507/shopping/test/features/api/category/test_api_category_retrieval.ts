import { ArrayUtil, RandomGenerator, TestValidator } from '@nestia/e2e';
import { IConnection } from '@nestia/fetcher';
import { randint } from 'tstl';
import typia, { tags } from 'typia';
import api from '@ORGANIZATION/PROJECT-api';
import { DeepPartial } from '@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial';
import { IEntity } from '@ORGANIZATION/PROJECT-api/lib/structures/IEntity';
import type { IAuthorizationToken } from '@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken';
import type { IShoppingMallProductCategory } from '@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory';
import type { IShoppingMallSeller } from '@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller';
import { prepare_random_shopping_mall_product_category } from '../../../prepare/prepare_random_shopping_mall_product_category';
import { authorize_seller_join } from '../../../authorize/authorize_seller_join';
import { authorize_seller_login } from '../../../authorize/authorize_seller_login';
import { authorize_seller_refresh } from '../../../authorize/authorize_seller_refresh';
export async function test_api_category_retrieval(connection: api.IConnection): Promise<void> {
    // Create seller connection and authenticate
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_join(sellerConnection, {
        body: {
            email: RandomGenerator.alphaNumeric(16) + '@example.com',
            password: RandomGenerator.alphaNumeric(16),
            name: RandomGenerator.name()
        }
    });

    // Create a product category with valid data
    const category = await api.functional.shoppingMall.seller.categories.create(sellerConnection, {
        body: {
            name: RandomGenerator.name()
        }
    });
    typia.assert(category);

    // Retrieve the created category
    const retrievedCategory = await api.functional.shoppingMall.categories.at(sellerConnection, {
        categoryId: category.id,
    });
    typia.assert(retrievedCategory);

    // Validate category data integrity
    TestValidator.equals('category ID matches after retrieval', category.id, retrievedCategory.id);
    TestValidator.equals('category name matches after retrieval', category.name, retrievedCategory.name);
    TestValidator.equals('childCount is non-negative as expected', category.childCount, retrievedCategory.childCount);
    TestValidator.equals('parent hierarchy information matches', category.parent, retrievedCategory.parent);
}