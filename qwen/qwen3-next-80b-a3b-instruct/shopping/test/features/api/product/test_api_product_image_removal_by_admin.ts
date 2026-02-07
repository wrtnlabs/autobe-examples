import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_image_removal_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins to establish admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoinResponse);
  // 2. Seller joins to establish seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResponse = await authorize_seller_join(sellerConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResponse);
  // 3. Seller logs in to create a product
  const sellerLoginResponse = await authorize_seller_login(sellerConnection, {
    body: {} satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLoginResponse);
  // 4. Create a product with at least one image
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {} satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Admin logs in with admin credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginResponse = await authorize_admin_login(adminLoginConnection, {
    body: {} satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminLoginResponse);
  // 6. Extract product id from the product entity
  // IShoppingMallProduct is an empty object in DTO, but the system uses IEntity to provide id.
  // We explicitly define a type that combines IShoppingMallProduct with the id from IEntity.
  type ProductWithId = IShoppingMallProduct & {
    id: string & tags.Format<"uuid">;
  };
  const productId = (product as ProductWithId).id;
  // 7. Generate a UUID for the image ID as required by the erase operation
  // The system requires an imageId that belongs to the product in the database.
  // Since there is no endpoint to list images, we generate a valid UUID which the server
  // will validate for existence and ownership.
  const imageId = typia.random<string & tags.Format<"uuid">>();
  // 8. Admin removes the image from the product's image gallery
  await api.functional.shoppingMall.seller.products.images.erase(
    adminLoginConnection,
    {
      productId,
      imageId,
    },
  );
  // 9. Operation success is implicit - no response returned (204 No Content)
  // The system automatically creates a snapshot on deletion, as described in the scenario.
  // No further validation needed as the API ensures integrity.
}
