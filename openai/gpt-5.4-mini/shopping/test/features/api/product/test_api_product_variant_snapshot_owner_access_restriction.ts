import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
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
import { generate_random_mall_platform_seller_products_variant_snapshots_create } from "../../../generate/generate_random_mall_platform_seller_products_variant_snapshots_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";
import { prepare_random_mall_platform_product_variant_snapshot } from "../../../prepare/prepare_random_mall_platform_product_variant_snapshot";

export async function test_api_product_variant_snapshot_owner_access_restriction(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_seller_join(ownerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` as string &
        tags.Format<"email">,
      password: "password1234",
      href: "https://example.com/seller/join",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(ownerAuthorized);
  const ownerProduct =
    await generate_random_mall_platform_seller_products_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: null,
          basePrice: 10000,
        } satisfies IMallPlatformProduct.ICreate,
      },
    );
  typia.assert(ownerProduct);
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruderAuthorized = await authorize_seller_join(intruderConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` as string &
        tags.Format<"email">,
      password: "password1234",
      href: "https://example.com/seller/join",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(intruderAuthorized);
  await TestValidator.error(
    "unauthorized seller cannot create product variant snapshot",
    async () => {
      await generate_random_mall_platform_seller_products_variant_snapshots_create(
        intruderConnection,
        {
          params: {
            productId: ownerProduct.id,
          },
        },
      );
    },
  );
}
