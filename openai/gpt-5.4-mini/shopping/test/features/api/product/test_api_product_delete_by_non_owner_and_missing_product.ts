import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
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
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";

export async function test_api_product_delete_by_non_owner_and_missing_product(
  connection: api.IConnection,
): Promise<void> {
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerABody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password1234!",
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IMallPlatformSeller.IJoin;
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: sellerABody,
  });
  typia.assert(sellerA);
  const sellerBBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password1234!",
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IMallPlatformSeller.IJoin;
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: sellerBBody,
  });
  typia.assert(sellerB);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: 1000,
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  await TestValidator.error(
    "non-owner seller cannot delete another seller's product",
    async () => {
      await api.functional.mallPlatform.seller.products.erase(
        sellerBConnection,
        {
          productId: product.id,
        },
      );
    },
  );
  await TestValidator.error(
    "missing product deletion should be handled safely",
    async () => {
      await api.functional.mallPlatform.seller.products.erase(
        sellerAConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
