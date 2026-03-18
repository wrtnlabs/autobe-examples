import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_product_images_create } from "../../../generate/generate_random_shopping_mall_member_product_images_create";
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_product_images_erase_last_image_product_remains_visible(
  connection: api.IConnection,
): Promise<void> {
  // 1) Prerequisite: authenticated seller + a product with exactly one active image
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_member_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(sellerAuth);
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          code: RandomGenerator.alphaNumeric(12),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_featured: typia.random<boolean>(),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const image =
    await generate_random_shopping_mall_member_product_images_create(
      sellerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          href: "https://example.com/product.jpg" satisfies string &
            tags.MaxLength<80000> &
            tags.Format<"uri">,
          alt_text: RandomGenerator.name(2),
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image);
  // 2) Delete the only remaining image
  await api.functional.shoppingMall.member.productImages.erase(
    sellerConnection,
    {
      productImageId: image.id,
    },
  );
  // 3) Validate product remains visible
  const fetched = await api.functional.shoppingMall.member.products.at(
    sellerConnection,
    {
      productId: product.id,
    },
  );
  typia.assert(fetched);
  // IShoppingMallProduct does not expose image gallery in its DTO, so we validate
  // that the product itself remains active/visible after the last-image deletion.
  TestValidator.equals("product id remains same", fetched.id, product.id);
  TestValidator.equals(
    "product is still active (not soft-deleted)",
    fetched.deleted_at,
    null,
  );
}
