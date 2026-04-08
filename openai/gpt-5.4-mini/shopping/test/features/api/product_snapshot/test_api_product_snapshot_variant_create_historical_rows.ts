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

export async function test_api_product_snapshot_variant_create_historical_rows(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` as string &
        tags.Format<"email">,
      password: "password1234" as string & tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const productSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const firstBody = {
    skuCode: `SKU-${RandomGenerator.alphabets(8)}`,
    optionValues: RandomGenerator.name(),
    priceOverride: null,
    isAvailable: true,
  } satisfies IMallPlatformProductSnapshotVariant.ICreate;
  const secondBody = {
    skuCode: `SKU-${RandomGenerator.alphabets(8)}`,
    optionValues: RandomGenerator.name(),
    priceOverride: typia.random<number>(),
    isAvailable: false,
  } satisfies IMallPlatformProductSnapshotVariant.ICreate;
  const first =
    await generate_random_mall_platform_seller_product_snapshots_variants_create(
      sellerConnection,
      {
        params: { productSnapshotId },
        body: firstBody,
      },
    );
  typia.assert(first);
  const second =
    await generate_random_mall_platform_seller_product_snapshots_variants_create(
      sellerConnection,
      {
        params: { productSnapshotId },
        body: secondBody,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "first historical row skuCode",
    first.skuCode,
    firstBody.skuCode,
  );
  TestValidator.equals(
    "first historical row optionValues",
    first.optionValues,
    firstBody.optionValues,
  );
  TestValidator.equals(
    "first historical row priceOverride",
    first.priceOverride,
    firstBody.priceOverride ?? null,
  );
  TestValidator.equals(
    "first historical row isAvailable",
    first.isAvailable,
    firstBody.isAvailable,
  );
  TestValidator.predicate(
    "first historical row createdAt is present",
    first.createdAt.length > 0,
  );
  TestValidator.predicate(
    "first historical row has generated id",
    first.id.length > 0,
  );
  TestValidator.equals(
    "second historical row skuCode",
    second.skuCode,
    secondBody.skuCode,
  );
  TestValidator.equals(
    "second historical row optionValues",
    second.optionValues,
    secondBody.optionValues,
  );
  TestValidator.equals(
    "second historical row priceOverride",
    second.priceOverride,
    secondBody.priceOverride ?? null,
  );
  TestValidator.equals(
    "second historical row isAvailable",
    second.isAvailable,
    secondBody.isAvailable,
  );
  TestValidator.predicate(
    "second historical row createdAt is present",
    second.createdAt.length > 0,
  );
  TestValidator.predicate(
    "second historical row has generated id",
    second.id.length > 0,
  );
  TestValidator.notEquals(
    "historical rows should be distinct",
    first.id,
    second.id,
  );
  TestValidator.notEquals(
    "historical rows should preserve separate SKUs",
    first.skuCode,
    second.skuCode,
  );
}
