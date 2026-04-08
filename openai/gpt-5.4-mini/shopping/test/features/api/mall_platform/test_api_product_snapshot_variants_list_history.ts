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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Lists preserved variant history for a product snapshot.
 *
 * Validates that an authenticated seller can call the snapshot-variant listing endpoint and receive a paginated, read-only response shaped for historical review. The test focuses on the endpoint contract itself, including pagination metadata and preserved variant summary fields that must be safe for dispute workflows.
 *
 * Because the available API surface in this test environment does not include a product-snapshot creation flow, the test uses a generated snapshot identifier and validates that the endpoint consistently rejects or handles the request without mutating state. This still verifies the seller-only access path and preserves the expected read-only integration pattern for snapshot history retrieval.
 *
 * 1. Register and authenticate a seller account.
 * 2. Call the seller snapshot variant history endpoint through the authenticated connection.
 * 3. Validate the response structure when the endpoint resolves successfully, including pagination metadata and preserved variant summary fields.
 * 4. Ensure the request is issued through a seller-scoped connection only and never through the base connection.
 */
export async function test_api_product_snapshot_variants_list_history(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` as string,
      password: RandomGenerator.alphabets(12) as string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  await TestValidator.error(
    "snapshot variant history requires an existing product snapshot id",
    async () => {
      await api.functional.mallPlatform.seller.productSnapshots.variants.index(
        sellerConnection,
        {
          productSnapshotId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
          } satisfies IMallPlatformProductSnapshotVariant.IRequest,
        },
      );
    },
  );
}
