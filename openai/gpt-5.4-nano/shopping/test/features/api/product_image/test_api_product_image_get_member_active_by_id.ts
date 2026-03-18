import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_product_images_create } from "../../../generate/generate_random_shopping_mall_member_product_images_create";
import { generate_random_shopping_mall_member_product_variants_create } from "../../../generate/generate_random_shopping_mall_member_product_variants_create";
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_image_get_member_active_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Actor-specific connection (member)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<IShoppingMallMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // Prepare seller-owned catalog state (product + at least one active image)
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      memberConnection,
      {},
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_member_product_variants_create(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
        },
      },
    );
  typia.assert(variant);
  const productImage =
    await generate_random_shopping_mall_member_product_images_create(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
        },
      },
    );
  typia.assert(productImage);
  // Execute: fetch active product image by id
  const imageResponse =
    await api.functional.shoppingMall.member.productImages.at(
      memberConnection,
      {
        productImageId: productImage.id,
      },
    );
  typia.assert(imageResponse);
  TestValidator.equals("id matches", imageResponse.id, productImage.id);
  TestValidator.equals(
    "display_order matches",
    imageResponse.display_order,
    productImage.display_order,
  );
  TestValidator.equals("href matches", imageResponse.href, productImage.href);
  TestValidator.equals(
    "alt_text matches",
    imageResponse.alt_text,
    productImage.alt_text,
  );
  TestValidator.equals("deleted_at is null", imageResponse.deleted_at, null);
}
