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
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { generate_random_shopping_mall_member_product_images_create } from "../../../generate/generate_random_shopping_mall_member_product_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_product_images_first_insert_and_audit_rollback_on_reject(
  connection: api.IConnection,
): Promise<void> {
  // Seller B joins
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Seller A joins (for cross-seller rejection)
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // --- Scenario 1: first insert (empty gallery) ---
  const productB1: IShoppingMallProduct =
    await generate_random_shopping_mall_member_products_create_product(
      sellerBConnection,
      {},
    );
  typia.assert(productB1);
  const href1 = `https://example.com/img-${RandomGenerator.alphabets(10)}`;
  const alt1 = `alt-${RandomGenerator.alphabets(8)}`;
  const image1: IShoppingMallProductImage =
    await api.functional.shoppingMall.member.productImages.create(
      sellerBConnection,
      {
        body: {
          shopping_mall_product_id: productB1.id,
          href: href1 satisfies string &
            tags.MaxLength<80000> &
            tags.Format<"uri">,
          alt_text: alt1,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image1);
  TestValidator.equals("first image display_order", image1.display_order, 1);
  TestValidator.equals(
    "first image deleted_at is null",
    image1.deleted_at,
    null,
  );
  // --- Scenario 2: append second image ---
  const href2 = `https://example.com/img-${RandomGenerator.alphabets(10)}`;
  const alt2 = `alt-${RandomGenerator.alphabets(8)}`;
  const image2: IShoppingMallProductImage =
    await api.functional.shoppingMall.member.productImages.create(
      sellerBConnection,
      {
        body: {
          shopping_mall_product_id: productB1.id,
          href: href2 satisfies string &
            tags.MaxLength<80000> &
            tags.Format<"uri">,
          alt_text: alt2,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image2);
  TestValidator.predicate(
    "second image display_order after first",
    () => image2.display_order > image1.display_order,
  );
  TestValidator.equals(
    "first image remains unchanged",
    image1.display_order,
    1,
  );
  TestValidator.equals(
    "second image deleted_at is null",
    image2.deleted_at,
    null,
  );
  // --- Scenario 3: cross-seller reject should rollback and not create artifacts ---
  const productB2: IShoppingMallProduct =
    await generate_random_shopping_mall_member_products_create_product(
      sellerBConnection,
      {},
    );
  typia.assert(productB2);
  const badHref = `https://example.com/img-${RandomGenerator.alphabets(10)}`;
  const badAlt = `alt-${RandomGenerator.alphabets(8)}`;
  await TestValidator.error(
    "cross-seller product image insert should be rejected and rolled back",
    async () => {
      await api.functional.shoppingMall.member.productImages.create(
        sellerAConnection,
        {
          body: {
            shopping_mall_product_id: productB2.id,
            href: badHref satisfies string &
              tags.MaxLength<80000> &
              tags.Format<"uri">,
            alt_text: badAlt,
          } satisfies IShoppingMallProductImage.ICreate,
        },
      );
    },
  );
}
