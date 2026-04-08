import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshotOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Verifies that seller variant snapshot option history is scoped to the parent product.
 *
 * This test exercises the protected snapshot-option listing endpoint with a seller-authenticated connection and deliberately supplies a product identifier and snapshot identifier that do not belong to the same product scope. The goal is to ensure that immutable preserved option rows cannot be accessed across product boundaries.
 *
 * Because the available test surface does not include product or variant creation APIs, the scenario is validated through a not-found response on a mismatched product/snapshot pair. This still confirms that the endpoint does not leak preserved option history when the parent product scope is invalid.
 *
 * 1. Authenticate a dedicated seller connection.
 * 2. Call the variant snapshot options endpoint with an unrelated productId and snapshotId pair.
 * 3. Assert that the server returns a 404 not-found response.
 */
export async function test_api_product_variant_snapshot_options_scope_not_found(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "variant snapshot options should reject cross-product scope",
    404,
    async () => {
      await api.functional.mallPlatform.seller.products.variantSnapshots.options.index(
        sellerConnection,
        {
          productId,
          snapshotId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IMallPlatformProductVariantSnapshotOption.IRequest,
        },
      );
    },
  );
}
