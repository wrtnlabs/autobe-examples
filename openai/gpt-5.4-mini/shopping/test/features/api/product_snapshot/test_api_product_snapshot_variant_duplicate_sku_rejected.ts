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

export async function test_api_product_snapshot_variant_duplicate_sku_rejected(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const productSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const duplicatedSkuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  await TestValidator.httpError(
    "duplicate SKU codes within a product snapshot should be rejected",
    [400, 409, 422],
    async () => {
      await generate_random_mall_platform_administrator_product_snapshots_variants_create(
        administratorConnection,
        {
          params: { productSnapshotId },
          body: {
            skuCode: duplicatedSkuCode,
            optionValues: "color:red,size:m",
            priceOverride: null,
            isAvailable: true,
          } satisfies IMallPlatformProductSnapshotVariant.ICreate,
        },
      );
      await generate_random_mall_platform_administrator_product_snapshots_variants_create(
        administratorConnection,
        {
          params: { productSnapshotId },
          body: {
            skuCode: duplicatedSkuCode,
            optionValues: "color:red,size:l",
            priceOverride: null,
            isAvailable: true,
          } satisfies IMallPlatformProductSnapshotVariant.ICreate,
        },
      );
    },
  );
}
