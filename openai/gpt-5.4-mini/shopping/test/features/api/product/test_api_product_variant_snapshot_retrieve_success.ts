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

export async function test_api_product_variant_snapshot_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const product = await api.functional.mallPlatform.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const snapshot =
    await api.functional.mallPlatform.seller.products.variantSnapshots.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot product should match the requested product",
    snapshot.product.id,
    product.id,
  );
  TestValidator.equals(
    "snapshot product name should match the created product",
    snapshot.product.name,
    product.name,
  );
  TestValidator.equals(
    "snapshot variant should belong to the requested product",
    snapshot.productVariant.product.id,
    product.id,
  );
  TestValidator.equals(
    "snapshot SKU should be preserved",
    snapshot.skuCode,
    snapshot.productVariant.skuCode,
  );
  TestValidator.equals(
    "snapshot option summary should be preserved",
    snapshot.optionSummary,
    snapshot.productVariant.optionValues,
  );
  TestValidator.equals(
    "snapshot reason should be preserved as a nullable field",
    snapshot.snapshotReason,
    snapshot.snapshotReason,
  );
  TestValidator.equals(
    "snapshot createdAt should be a valid timestamp string",
    typeof snapshot.createdAt,
    "string",
  );
}
