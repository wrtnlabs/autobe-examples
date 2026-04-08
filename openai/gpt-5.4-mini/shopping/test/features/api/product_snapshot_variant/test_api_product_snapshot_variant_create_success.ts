import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_mall_platform_administrator_product_snapshots_variants_create } from "../../../generate/generate_random_mall_platform_administrator_product_snapshots_variants_create";
import { prepare_random_mall_platform_product_snapshot_variant } from "../../../prepare/prepare_random_mall_platform_product_snapshot_variant";

export async function test_api_product_snapshot_variant_create_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Create preserved historical product snapshot variants for administrator audit history.
   *
   * This test validates that an administrator can create snapshot-history variant rows under a specific product snapshot. It checks that the API returns immutable preserved rows with generated identifiers and timestamps, and that the submitted SKU code, serialized option values, optional price override, and availability flag are reflected in the response.
   *
   * 1. Register an administrator and authenticate with an isolated connection.
   * 2. Create multiple historical variant rows for the same product snapshot identifier.
   * 3. Validate the returned preserved rows, their timestamps, and their association to the requested snapshot.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: `${RandomGenerator.alphabets(8)}@example.com` as string,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const productSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const skuSuffix = RandomGenerator.alphabets(6).toUpperCase();
  const firstBody = {
    skuCode: `SNAP-${skuSuffix}`,
    optionValues: JSON.stringify({ color: "Red", size: "Large" }),
    priceOverride: 12900,
    isAvailable: true,
  } satisfies IMallPlatformProductSnapshotVariant.ICreate;
  const first =
    await generate_random_mall_platform_administrator_product_snapshots_variants_create(
      administratorConnection,
      {
        params: { productSnapshotId },
        body: firstBody,
      },
    );
  typia.assert(first);
  TestValidator.equals(
    "first row belongs to requested product snapshot",
    first.productSnapshot.id,
    productSnapshotId,
  );
  TestValidator.equals(
    "first row sku code preserved",
    first.skuCode,
    firstBody.skuCode,
  );
  TestValidator.equals(
    "first row option values preserved",
    first.optionValues,
    firstBody.optionValues,
  );
  TestValidator.equals(
    "first row price override preserved",
    first.priceOverride,
    firstBody.priceOverride ?? null,
  );
  TestValidator.equals(
    "first row availability preserved",
    first.isAvailable,
    firstBody.isAvailable,
  );
  TestValidator.predicate("first row id generated", first.id.length > 0);
  TestValidator.predicate(
    "first row createdAt generated",
    first.createdAt.length > 0,
  );
  const secondBody = {
    skuCode: `SNAP-${RandomGenerator.alphabets(6).toUpperCase()}`,
    optionValues: JSON.stringify({ color: "Blue", size: "Small" }),
    priceOverride: null,
    isAvailable: false,
  } satisfies IMallPlatformProductSnapshotVariant.ICreate;
  const second =
    await generate_random_mall_platform_administrator_product_snapshots_variants_create(
      administratorConnection,
      {
        params: { productSnapshotId },
        body: secondBody,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "second row belongs to requested product snapshot",
    second.productSnapshot.id,
    productSnapshotId,
  );
  TestValidator.equals(
    "second row sku code preserved",
    second.skuCode,
    secondBody.skuCode,
  );
  TestValidator.equals(
    "second row option values preserved",
    second.optionValues,
    secondBody.optionValues,
  );
  TestValidator.equals(
    "second row price override preserved as null",
    second.priceOverride,
    null,
  );
  TestValidator.equals(
    "second row availability preserved",
    second.isAvailable,
    secondBody.isAvailable,
  );
  TestValidator.predicate("second row id generated", second.id.length > 0);
  TestValidator.predicate(
    "second row createdAt generated",
    second.createdAt.length > 0,
  );
  TestValidator.notEquals(
    "created rows have different ids",
    first.id,
    second.id,
  );
  TestValidator.notEquals(
    "created rows have different sku codes",
    first.skuCode,
    second.skuCode,
  );
}
