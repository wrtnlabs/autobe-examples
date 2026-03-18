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

export async function test_api_product_images_erase_non_existent_image_no_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create authenticated member (seller)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password!234567890" satisfies string & tags.Format<"password">,
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Create a product
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          code: RandomGenerator.alphabets(10),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_featured: false,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 3) Create an ordered image set
  const images: IShoppingMallProductImage[] = [];
  const displayOrders = [0, 1, 2] as const;
  for (const display_order of displayOrders) {
    const image =
      await generate_random_shopping_mall_member_product_images_create(
        sellerConnection,
        {
          body: {
            shopping_mall_product_id: product.id,
            href: `https://example.com/img_${RandomGenerator.alphabets(8)}_${display_order}.png` satisfies string &
              tags.MaxLength<80000> &
              tags.Format<"uri">,
            alt_text: `alt_${RandomGenerator.alphabets(6)}_${display_order}`,
            display_order: display_order satisfies number & tags.Type<"int32">,
          } satisfies IShoppingMallProductImage.ICreate,
        },
      );
    typia.assert(image);
    images.push(image);
  }
  const baseline = [...images].sort(
    (a, b) => a.display_order - b.display_order,
  );
  // 4) Delete one existing image successfully
  const target = baseline[1];
  await api.functional.shoppingMall.member.productImages.erase(
    sellerConnection,
    { productImageId: target.id },
  );
  // 5) Delete the same image again (non-existent now). Should fail (not-found style)
  await TestValidator.error(
    "deleting an already-deleted product image should fail",
    async () => {
      await api.functional.shoppingMall.member.productImages.erase(
        sellerConnection,
        { productImageId: target.id },
      );
    },
  );
  // 6) Validate no side effects to the rest: other images should still be deletable
  //    (if the system accidentally removed/reordered them, these deletions would fail.)
  // Delete images in original display order except the already-deleted one.
  const remainingInOrder = baseline.filter((img) => img.id !== target.id);
  for (const img of remainingInOrder) {
    await api.functional.shoppingMall.member.productImages.erase(
      sellerConnection,
      { productImageId: img.id },
    );
  }
}
