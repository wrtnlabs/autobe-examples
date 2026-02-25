import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create_image } from "../../../generate/generate_random_shopping_mall_seller_products_images_create_image";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_image_retrieve_success_with_authorized_seller(connection: api.IConnection): Promise<void> {
    // 1. Seller registration and login
    const sellerConnection: api.IConnection = { host: connection.host };
    const authorizedSeller = await authorize_seller_join(sellerConnection, { body: {} });
    typia.assert(authorizedSeller);
    // Upgrade connection with authorization token
    sellerConnection.headers = {
        Authorization: `Bearer ${authorizedSeller.token.access}`,
    };
    // 2. Create a new product for the authorized seller
    const product = await generate_random_shopping_mall_seller_products_create(sellerConnection, { body: {} });
    typia.assert(product);
    // 3. Create a new product image for the created product
    const productImage = await generate_random_shopping_mall_seller_products_images_create_image(sellerConnection, {
        params: { productId: product.id },
        body: {},
    });
    typia.assert(productImage);
    // 4. Retrieve the product image using seller's authorized connection
    const retrievedImage = await api.functional.shoppingMall.seller.products.images.at(sellerConnection, {
        productId: product.id,
        imageId: productImage.id,
    });
    typia.assert(retrievedImage);
    // 5. Validate retrieved data matches created product image data
    TestValidator.equals("retrieved image id matches", retrievedImage.id, productImage.id);
    TestValidator.equals("retrieved image productId matches", retrievedImage.shoppingMallProductId, product.id);
    TestValidator.equals("image url matches", retrievedImage.imageUrl, productImage.imageUrl);
    TestValidator.equals("display order matches", retrievedImage.displayOrder, productImage.displayOrder);
    TestValidator.equals("deletedAt is null", retrievedImage.deletedAt, null);
    // 6. Validate timestamps exist and are valid ISO string date-times
    const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    TestValidator.predicate("createdAt is ISO date-time", isoDateTimeRegex.test(retrievedImage.createdAt));
    TestValidator.predicate("updatedAt is ISO date-time", isoDateTimeRegex.test(retrievedImage.updatedAt));
    // 7. Confirm no unauthorized access (optional negative test could be separate)
}
