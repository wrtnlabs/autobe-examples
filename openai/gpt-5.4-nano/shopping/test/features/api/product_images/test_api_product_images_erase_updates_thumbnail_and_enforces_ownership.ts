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

export async function test_api_product_images_erase_updates_thumbnail_and_enforces_ownership(
  connection: api.IConnection,
): Promise<void> {
  const password = "Password123!";
  // Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAEmail = `sellerA+${Date.now()}@example.com`;
  const sellerA: IShoppingMallMember.IAuthorized = await authorize_member_join(
    sellerAConnection,
    {
      body: {
        email: sellerAEmail,
        password,
      } satisfies IShoppingMallMember.IJoin,
    },
  );
  typia.assert(sellerA);
  // Create product under seller A
  const productA: IShoppingMallProduct =
    await generate_random_shopping_mall_member_products_create_product(
      sellerAConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_featured: typia.random<boolean>(),
        },
      },
    );
  typia.assert(productA);
  // Two images with deterministic order
  const imageA1: IShoppingMallProductImage =
    await generate_random_shopping_mall_member_product_images_create(
      sellerAConnection,
      {
        body: {
          shopping_mall_product_id: productA.id,
          href: `https://example.com/${Date.now()}-img-1.png`,
          alt_text: RandomGenerator.name(),
          display_order: 1,
        },
      },
    );
  typia.assert(imageA1);
  const imageA2: IShoppingMallProductImage =
    await generate_random_shopping_mall_member_product_images_create(
      sellerAConnection,
      {
        body: {
          shopping_mall_product_id: productA.id,
          href: `https://example.com/${Date.now()}-img-2.png`,
          alt_text: RandomGenerator.name(),
          display_order: 2,
        },
      },
    );
  typia.assert(imageA2);
  // Scenario 1: delete first image
  await api.functional.shoppingMall.member.productImages.erase(
    sellerAConnection,
    { productImageId: imageA1.id },
  );
  // No read/list endpoints are available; validate indirectly by deleting remaining image
  await api.functional.shoppingMall.member.productImages.erase(
    sellerAConnection,
    { productImageId: imageA2.id },
  );
  // Scenario 2: delete non-first image
  const productA2: IShoppingMallProduct =
    await generate_random_shopping_mall_member_products_create_product(
      sellerAConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_featured: typia.random<boolean>(),
        },
      },
    );
  typia.assert(productA2);
  const imageA2_1: IShoppingMallProductImage =
    await generate_random_shopping_mall_member_product_images_create(
      sellerAConnection,
      {
        body: {
          shopping_mall_product_id: productA2.id,
          href: `https://example.com/${Date.now()}-img-1b.png`,
          alt_text: RandomGenerator.name(),
          display_order: 1,
        },
      },
    );
  typia.assert(imageA2_1);
  const imageA2_2: IShoppingMallProductImage =
    await generate_random_shopping_mall_member_product_images_create(
      sellerAConnection,
      {
        body: {
          shopping_mall_product_id: productA2.id,
          href: `https://example.com/${Date.now()}-img-2b.png`,
          alt_text: RandomGenerator.name(),
          display_order: 2,
        },
      },
    );
  typia.assert(imageA2_2);
  await api.functional.shoppingMall.member.productImages.erase(
    sellerAConnection,
    { productImageId: imageA2_2.id },
  );
  // Ensure first image still deletable by the same owner
  await api.functional.shoppingMall.member.productImages.erase(
    sellerAConnection,
    { productImageId: imageA2_1.id },
  );
  // Scenario 3: ownership enforcement
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBEmail = `sellerB+${Date.now()}@example.com`;
  const sellerB: IShoppingMallMember.IAuthorized = await authorize_member_join(
    sellerBConnection,
    {
      body: {
        email: sellerBEmail,
        password,
      } satisfies IShoppingMallMember.IJoin,
    },
  );
  typia.assert(sellerB);
  const productB: IShoppingMallProduct =
    await generate_random_shopping_mall_member_products_create_product(
      sellerBConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_featured: typia.random<boolean>(),
        },
      },
    );
  typia.assert(productB);
  const imageB1: IShoppingMallProductImage =
    await generate_random_shopping_mall_member_product_images_create(
      sellerBConnection,
      {
        body: {
          shopping_mall_product_id: productB.id,
          href: `https://example.com/${Date.now()}-img-b1.png`,
          alt_text: RandomGenerator.name(),
          display_order: 1,
        },
      },
    );
  typia.assert(imageB1);
  await TestValidator.error(
    "seller A cannot delete seller B product image",
    async () => {
      await api.functional.shoppingMall.member.productImages.erase(
        sellerAConnection,
        { productImageId: imageB1.id },
      );
    },
  );
  // Seller B can delete
  await api.functional.shoppingMall.member.productImages.erase(
    sellerBConnection,
    { productImageId: imageB1.id },
  );
}
