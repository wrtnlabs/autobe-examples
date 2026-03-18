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

export async function test_api_product_images_display_order_and_ownership_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1) Seller A login
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_member_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(sellerAAuth);

  // 2) Seller B login
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_member_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(sellerBAuth);

  // Create seller-owned products
  const productA = await generate_random_shopping_mall_member_products_create_product(
    sellerAConnection,
    undefined as unknown as Parameters<
      typeof generate_random_shopping_mall_member_products_create_product
    >[1],
  );
  typia.assert(productA);

  const productB =
    await generate_random_shopping_mall_member_products_create_product(
      sellerBConnection,
      undefined as unknown as Parameters<
        typeof generate_random_shopping_mall_member_products_create_product
      >[1],
    );
  typia.assert(productB);

  // --------------------------
  // Scenario 1: explicit display_order persisted
  // --------------------------
  const explicitDisplayOrder: number & tags.Type<"int32"> = 7;
  const image1 =
    await generate_random_shopping_mall_member_product_images_create(
      sellerAConnection,
      {
        body: {
          shopping_mall_product_id: productA.id,
          href: "https://example.com/image-1.png",
          alt_text: "product image 1",
          display_order: explicitDisplayOrder,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image1);
  TestValidator.equals(
    "image display_order persisted",
    image1.display_order,
    explicitDisplayOrder,
  );
  TestValidator.equals("image deleted_at is null", image1.deleted_at, null);

  // --------------------------
  // Scenario 2: omit display_order => max(active)+1
  // --------------------------
  const baselineOrder: number & tags.Type<"int32"> = 1;
  const baselineImage =
    await generate_random_shopping_mall_member_product_images_create(
      sellerAConnection,
      {
        body: {
          shopping_mall_product_id: productA.id,
          href: "https://example.com/image-2.png",
          alt_text: "product image 2",
          display_order: baselineOrder,
        },
      },
    );
  typia.assert(baselineImage);

  const expectedNext =
    Math.max(image1.display_order, baselineImage.display_order) + 1;
  const image2 =
    await generate_random_shopping_mall_member_product_images_create(
      sellerAConnection,
      {
        body: {
          shopping_mall_product_id: productA.id,
          href: "https://example.com/image-3.png",
          alt_text: "product image 3",
        },
      },
    );
  typia.assert(image2);

  TestValidator.equals(
    "next image display_order computed as max+1",
    image2.display_order,
    expectedNext,
  );
  TestValidator.equals(
    "baseline image ordering unchanged",
    baselineImage.display_order,
    baselineOrder,
  );

  // --------------------------
  // Scenario 3: cross-seller attempt rejected
  // --------------------------
  await TestValidator.error(
    "cross-seller image creation rejected",
    async () => {
      await generate_random_shopping_mall_member_product_images_create(
        sellerAConnection,
        {
          body: {
            shopping_mall_product_id: productB.id,
            href: "https://example.com/image-cross.png",
            alt_text: "cross seller attempt",
          } satisfies IShoppingMallProductImage.ICreate,
        },
      );
    },
  );
}
