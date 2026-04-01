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

export async function test_api_product_variant_snapshot_creation(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "A1!",
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: typia.random<number>(),
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const snapshot =
    await generate_random_mall_platform_seller_products_variant_snapshots_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {} satisfies IMallPlatformProductVariantSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot product id matches",
    snapshot.product.id,
    product.id,
  );
  TestValidator.equals(
    "snapshot product name matches live product",
    snapshot.product.name,
    product.name,
  );
  TestValidator.equals(
    "snapshot product description matches live product",
    snapshot.product.description,
    product.description,
  );
  TestValidator.equals(
    "snapshot product base price matches live product",
    snapshot.product.basePrice,
    product.basePrice,
  );
  TestValidator.equals(
    "snapshot seller account matches live product seller",
    snapshot.product.sellerAccount.id,
    product.sellerAccount.id,
  );
  TestValidator.predicate(
    "snapshot created at is present",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot sku code is present",
    snapshot.skuCode.length > 0,
  );
  TestValidator.predicate(
    "snapshot option summary is present",
    snapshot.optionSummary.length > 0,
  );
  TestValidator.predicate(
    "snapshot price override is nullable or numeric",
    snapshot.priceOverride === null ||
      typeof snapshot.priceOverride === "number",
  );
  TestValidator.predicate(
    "snapshot reason is nullable or string",
    snapshot.snapshotReason === null ||
      typeof snapshot.snapshotReason === "string",
  );
  TestValidator.equals(
    "snapshot product variant points to same product",
    snapshot.productVariant.product.id,
    product.id,
  );
}
