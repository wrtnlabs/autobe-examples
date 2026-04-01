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

export async function test_api_product_variant_snapshot_seller_auth_required(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: typia.random<number & tags.Type<"uint32">>(),
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const snapshot =
    await api.functional.mallPlatform.seller.products.variantSnapshots.create(
      sellerConnection,
      {
        productId: product.id,
        body: {},
      },
    );
  typia.assert(snapshot);
  const loaded =
    await api.functional.mallPlatform.seller.products.variantSnapshots.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(loaded);
  TestValidator.equals("snapshot id should match", loaded.id, snapshot.id);
  TestValidator.equals(
    "snapshot product id should match",
    loaded.product.id,
    product.id,
  );
  TestValidator.equals(
    "snapshot product name should match",
    loaded.product.name,
    product.name,
  );
  TestValidator.equals(
    "snapshot option summary should match",
    loaded.optionSummary,
    snapshot.optionSummary,
  );
  TestValidator.equals(
    "snapshot sku code should match",
    loaded.skuCode,
    snapshot.skuCode,
  );
  TestValidator.equals(
    "snapshot created time should match",
    loaded.createdAt,
    snapshot.createdAt,
  );
  await TestValidator.httpError(
    "unauthenticated seller snapshot access should be denied",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.seller.products.variantSnapshots.at(
        connection,
        {
          productId: product.id,
          snapshotId: snapshot.id,
        },
      );
    },
  );
}
