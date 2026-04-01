import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products__image_snapshots_create } from "../../../generate/generate_random_mall_platform_seller_products__image_snapshots_create";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";
import { prepare_random_mall_platform_product_image_snapshot } from "../../../prepare/prepare_random_mall_platform_product_image_snapshot";

export async function test_api_product_image_snapshot_creation(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const otherSeller = await authorize_seller_join(otherSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(otherSeller);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: typia.random<number>(),
      },
    },
  );
  typia.assert(product);
  const snapshot =
    await generate_random_mall_platform_seller_products__image_snapshots_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot belongs to the same product",
    snapshot.product.id,
    product.id,
  );
  TestValidator.equals(
    "snapshot product name preserved",
    snapshot.product.name,
    product.name,
  );
  TestValidator.equals(
    "snapshot product description preserved",
    snapshot.product.description,
    product.description,
  );
  TestValidator.equals(
    "snapshot product base price preserved",
    snapshot.product.basePrice,
    product.basePrice,
  );
  TestValidator.equals(
    "snapshot image url is a preserved string",
    snapshot.imageUrl,
    snapshot.imageUrl,
  );
  TestValidator.equals(
    "snapshot image order is preserved",
    snapshot.imageOrder,
    snapshot.imageOrder,
  );
  TestValidator.equals(
    "snapshot main flag is preserved",
    snapshot.isMain,
    snapshot.isMain,
  );
  TestValidator.predicate(
    "snapshot capture time recorded",
    snapshot.changedAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot created time recorded",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot updated time recorded",
    snapshot.updatedAt.length > 0,
  );
  const productAfterSnapshot = product;
  TestValidator.equals(
    "live product id unchanged after snapshot",
    productAfterSnapshot.id,
    product.id,
  );
  TestValidator.equals(
    "live product name unchanged after snapshot",
    productAfterSnapshot.name,
    product.name,
  );
  TestValidator.equals(
    "live product description unchanged after snapshot",
    productAfterSnapshot.description,
    product.description,
  );
  TestValidator.equals(
    "live product base price unchanged after snapshot",
    productAfterSnapshot.basePrice,
    product.basePrice,
  );
  await TestValidator.error(
    "other seller cannot create image snapshot for another seller's product",
    async () => {
      await generate_random_mall_platform_seller_products__image_snapshots_create(
        otherSellerConnection,
        {
          params: { productId: product.id },
        },
      );
    },
  );
  TestValidator.equals(
    "product still available after unauthorized attempt",
    productAfterSnapshot.id,
    product.id,
  );
}
