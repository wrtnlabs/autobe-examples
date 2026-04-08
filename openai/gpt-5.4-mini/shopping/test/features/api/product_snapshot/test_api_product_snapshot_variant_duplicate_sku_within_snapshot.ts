import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
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
import { generate_random_mall_platform_seller_product_snapshots_variants_create } from "../../../generate/generate_random_mall_platform_seller_product_snapshots_variants_create";
import { prepare_random_mall_platform_product_snapshot_variant } from "../../../prepare/prepare_random_mall_platform_product_snapshot_variant";

export async function test_api_product_snapshot_variant_duplicate_sku_within_snapshot(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail: string = `${RandomGenerator.alphabets(10)}@test.com`;
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const productSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const skuCode = `SKU-${RandomGenerator.alphabets(8)}`;
  const firstBody = {
    skuCode,
    optionValues: "color=red,size=large",
    priceOverride: null,
    isAvailable: true,
  } satisfies IMallPlatformProductSnapshotVariant.ICreate;
  const firstCreated =
    await generate_random_mall_platform_seller_product_snapshots_variants_create(
      sellerConnection,
      {
        params: { productSnapshotId },
        body: firstBody,
      },
    );
  typia.assert(firstCreated);
  TestValidator.equals(
    "first SKU matches request",
    firstCreated.skuCode,
    skuCode,
  );
  await TestValidator.error(
    "duplicate SKU within same snapshot should fail",
    async () => {
      await generate_random_mall_platform_seller_product_snapshots_variants_create(
        sellerConnection,
        {
          params: { productSnapshotId },
          body: {
            skuCode,
            optionValues: "color=blue,size=small",
            priceOverride: 1234,
            isAvailable: false,
          } satisfies IMallPlatformProductSnapshotVariant.ICreate,
        },
      );
    },
  );
  const secondBody = {
    skuCode: `SKU-${RandomGenerator.alphabets(8)}`,
    optionValues: "color=blue,size=small",
    priceOverride: 1234,
    isAvailable: false,
  } satisfies IMallPlatformProductSnapshotVariant.ICreate;
  const secondCreated =
    await generate_random_mall_platform_seller_product_snapshots_variants_create(
      sellerConnection,
      {
        params: { productSnapshotId },
        body: secondBody,
      },
    );
  typia.assert(secondCreated);
  TestValidator.notEquals(
    "different SKU should be inserted successfully",
    secondCreated.skuCode,
    firstCreated.skuCode,
  );
  TestValidator.equals(
    "second SKU matches request",
    secondCreated.skuCode,
    secondBody.skuCode,
  );
}
