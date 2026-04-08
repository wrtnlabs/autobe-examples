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

/**
 * Verifies that creating historical variant rows fails when the parent product snapshot does not exist.
 *
 * This test authenticates as an administrator, calls the historical snapshot-variant creation endpoint with a random non-existent productSnapshotId, and asserts that the request is rejected as not found.
 *
 * It focuses on the parent existence rule for immutable snapshot history and ensures the failed operation does not return a created snapshot variant payload.
 */
export async function test_api_product_snapshot_variant_parent_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const body = {
    skuCode: RandomGenerator.alphabets(12),
    optionValues: RandomGenerator.paragraph({ sentences: 2 }),
    priceOverride: null,
    isAvailable: true,
  } satisfies IMallPlatformProductSnapshotVariant.ICreate;
  await TestValidator.httpError(
    "parent product snapshot must exist before creating historical variant rows",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.productSnapshots.variants.create(
        adminConnection,
        {
          productSnapshotId: typia.random<string & tags.Format<"uuid">>(),
          body,
        },
      );
    },
  );
}
