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

export async function test_api_product_images_add_image_snapshot_and_ordering(
  connection: api.IConnection,
): Promise<void> {
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_member_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });

  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_member_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });

  TestValidator.notEquals("seller ids should differ", sellerA.id, sellerB.id);

  const sellerProduct: IShoppingMallProduct =
    await generate_random_shopping_mall_member_products_create_product(
      sellerAConnection,
      {
        body: {},
      },
    );
  typia.assert(sellerProduct);

  const initialImage: IShoppingMallProductImage =
    await generate_random_shopping_mall_member_product_images_create(
      sellerAConnection,
      {
        body: {
          shopping_mall_product_id: sellerProduct.id,
        },
      },
    );
  typia.assert(initialImage);

  const nextHref = typia.random<
    string & tags.MaxLength<80000> & tags.Format<"uri">
  >();
  const nextAlt = RandomGenerator.alphabets(12);

  const appendedImage: IShoppingMallProductImage =
    await generate_random_shopping_mall_member_product_images_create(
      sellerAConnection,
      {
        body: {
          shopping_mall_product_id: sellerProduct.id,
          href: nextHref,
          alt_text: nextAlt,
          display_order: undefined,
        },
      },
    );
  typia.assert(appendedImage);

  TestValidator.equals(
    "product id matches",
    appendedImage.shopping_mall_product_id,
    sellerProduct.id,
  );
  TestValidator.equals("deleted_at is null", appendedImage.deleted_at, null);
  TestValidator.equals(
    "display_order is max + 1",
    appendedImage.display_order,
    initialImage.display_order + 1,
  );
  TestValidator.equals(
    "initial image display_order unchanged",
    initialImage.display_order,
    initialImage.display_order,
  );
  TestValidator.equals(
    "initial image deleted_at is null",
    initialImage.deleted_at,
    null,
  );

  const sellerBProduct: IShoppingMallProduct =
    await generate_random_shopping_mall_member_products_create_product(
      sellerBConnection,
      {
        body: {},
      },
    );
  typia.assert(sellerBProduct);

  const sellerBInitialImage: IShoppingMallProductImage =
    await generate_random_shopping_mall_member_product_images_create(
      sellerBConnection,
      {
        body: {
          shopping_mall_product_id: sellerBProduct.id,
        },
      },
    );
  typia.assert(sellerBInitialImage);

  const attackerHref = typia.random<
    string & tags.MaxLength<80000> & tags.Format<"uri">
  >();
  const attackerAlt = RandomGenerator.alphabets(14);

  await TestValidator.error(
    "cross-seller image creation should be rejected",
    async () => {
      await generate_random_shopping_mall_member_product_images_create(
        sellerAConnection,
        {
          body: {
            shopping_mall_product_id: sellerBProduct.id,
            href: attackerHref,
            alt_text: attackerAlt,
            display_order: undefined,
          },
        },
      );
    },
  );

  const sellerBNextHref = typia.random<
    string & tags.MaxLength<80000> & tags.Format<"uri">
  >();
  const sellerBNextAlt = RandomGenerator.alphabets(10);

  const sellerBAppendedImage: IShoppingMallProductImage =
    await generate_random_shopping_mall_member_product_images_create(
      sellerBConnection,
      {
        body: {
          shopping_mall_product_id: sellerBProduct.id,
          href: sellerBNextHref,
          alt_text: sellerBNextAlt,
          display_order: undefined,
        },
      },
    );
  typia.assert(sellerBAppendedImage);

  TestValidator.equals(
    "seller B next image display_order is initial + 1 (no rollback violations)",
    sellerBAppendedImage.display_order,
    sellerBInitialImage.display_order + 1,
  );
  TestValidator.equals(
    "seller B appended image deleted_at is null",
    sellerBAppendedImage.deleted_at,
    null,
  );

  const sellerBNextHref2 = typia.random<
    string & tags.MaxLength<80000> & tags.Format<"uri">
  >();
  const sellerBNextAlt2 = RandomGenerator.alphabets(11);

  const sellerBSuccessSecondInsert: IShoppingMallProductImage =
    await generate_random_shopping_mall_member_product_images_create(
      sellerBConnection,
      {
        body: {
          shopping_mall_product_id: sellerBProduct.id,
          href: sellerBNextHref2,
          alt_text: sellerBNextAlt2,
          display_order: undefined,
        },
      },
    );
  typia.assert(sellerBSuccessSecondInsert);

  TestValidator.equals(
    "display_order increments sequentially after previous success",
    sellerBSuccessSecondInsert.display_order,
    sellerBAppendedImage.display_order + 1,
  );
  TestValidator.equals(
    "deleted_at is null for success insert",
    sellerBSuccessSecondInsert.deleted_at,
    null,
  );
}
