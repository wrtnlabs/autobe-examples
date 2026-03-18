import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_deletion_success_disappears_from_browsing_and_wishlist(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Seller successfully deletes an eligible product.
  // Note: Provided SDK/utilities do not include customer browsing or wishlist read endpoints,
  // nor order-item status query endpoints, so those disappearance validations cannot be executed here.
  // 1) Member join as seller (owning member)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sellerConnection, {
    body: undefined,
  });
  // 2) Create a seller-owned product
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      sellerConnection,
      {
        body: undefined,
      },
    );
  typia.assert(product);
  // 5) Delete product as owning seller
  await api.functional.shoppingMall.member.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 6) No payload returned for successful deletion.
  // Customer browsing & wishlist disappearance cannot be asserted with available endpoints.
}
