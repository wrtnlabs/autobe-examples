import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
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

export async function test_api_product_variant_snapshot_product_scope_enforcement(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const firstProduct =
    await generate_random_mall_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: Math.max(1, Math.floor(Math.random() * 100000) + 1),
        },
      },
    );
  typia.assert(firstProduct);
  const secondProduct =
    await generate_random_mall_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: Math.max(1, Math.floor(Math.random() * 100000) + 1),
        },
      },
    );
  typia.assert(secondProduct);
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "variant snapshot should be scoped to the requested product",
    404,
    async () => {
      await api.functional.mallPlatform.seller.products.variantSnapshots.at(
        sellerConnection,
        {
          productId: firstProduct.id,
          snapshotId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "variant snapshot should also be hidden under the wrong product scope",
    404,
    async () => {
      await api.functional.mallPlatform.seller.products.variantSnapshots.at(
        sellerConnection,
        {
          productId: secondProduct.id,
          snapshotId,
        },
      );
    },
  );
}
