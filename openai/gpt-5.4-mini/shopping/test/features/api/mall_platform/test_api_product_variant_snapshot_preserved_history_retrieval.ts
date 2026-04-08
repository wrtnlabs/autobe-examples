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

export async function test_api_product_variant_snapshot_preserved_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(joined);
  const response =
    await api.functional.mallPlatform.seller.products.snapshots.variants.getByProductidAndSnapshotidAndVariantsnapshotid(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        variantSnapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "snapshot id is a uuid reference",
    response.id,
    response.id,
  );
  TestValidator.equals(
    "product reference is preserved",
    response.product.id,
    response.product.id,
  );
  TestValidator.equals(
    "variant reference is preserved",
    response.productVariant.id,
    response.productVariant.id,
  );
  TestValidator.equals(
    "sku code is preserved",
    response.skuCode,
    response.skuCode,
  );
  TestValidator.equals(
    "option summary is preserved",
    response.optionSummary,
    response.optionSummary,
  );
  TestValidator.equals(
    "price override is preserved",
    response.priceOverride,
    response.priceOverride,
  );
  TestValidator.equals(
    "snapshot reason is preserved",
    response.snapshotReason,
    response.snapshotReason,
  );
  TestValidator.equals(
    "created at is preserved",
    response.createdAt,
    response.createdAt,
  );
}
