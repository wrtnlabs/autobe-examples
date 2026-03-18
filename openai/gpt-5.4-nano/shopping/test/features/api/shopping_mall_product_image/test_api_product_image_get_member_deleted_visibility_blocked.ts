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

export async function test_api_product_image_get_member_deleted_visibility_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member authorization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password_1234!",
    } satisfies IShoppingMallMember.IJoin,
  });
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers ??= {};
  authorizedConnection.headers.Authorization = memberAuth.token.access;

  // 2) Create a seller-owned product
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      authorizedConnection,
      {
        body: {
          shopping_mall_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          code: `${RandomGenerator.alphabets(8)}_${RandomGenerator.alphabets(8)}`,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_featured: true,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3) Create at least one variant
  const variant =
    await generate_random_shopping_mall_member_product_variants_create(
      authorizedConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          code: `${RandomGenerator.alphabets(8)}_${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(),
          option_value: RandomGenerator.alphabets(10),
          price: randint(1000, 100000),
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);

  // 4) Create two images, then delete one
  const activeImage =
    await generate_random_shopping_mall_member_product_images_create(
      authorizedConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          href: `https://example.com/${RandomGenerator.alphabets(10)}.png`,
          alt_text: `alt-${RandomGenerator.alphabets(10)}`,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(activeImage);

  const deletedImage =
    await generate_random_shopping_mall_member_product_images_create(
      authorizedConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          href: `https://example.com/${RandomGenerator.alphabets(10)}.png`,
          alt_text: `alt-${RandomGenerator.alphabets(10)}`,
          display_order: activeImage.display_order + 1,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(deletedImage);

  await api.functional.shoppingMall.member.productImages.erase(
    authorizedConnection,
    {
      productImageId: deletedImage.id,
    },
  );

  // 5) Deleted image must be inaccessible
  await TestValidator.error(
    "deleted product image should be inaccessible",
    async () => {
      const result =
        await api.functional.shoppingMall.member.productImages.at(
          authorizedConnection,
          {
            productImageId: deletedImage.id,
          },
        );
      typia.assert(result);
      TestValidator.notEquals(
        "image id should not match deleted image",
        result.id,
        deletedImage.id,
      );
    },
  );

  // 6) Active image should remain retrievable
  const fetchedActive =
    await api.functional.shoppingMall.member.productImages.at(
      authorizedConnection,
      {
        productImageId: activeImage.id,
      },
    );
  typia.assert(fetchedActive);

  TestValidator.equals(
    "active image id should match",
    fetchedActive.id,
    activeImage.id,
  );
}
