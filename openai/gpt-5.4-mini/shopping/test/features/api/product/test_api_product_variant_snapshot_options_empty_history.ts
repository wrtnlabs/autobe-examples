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
 * Verifies empty option-history browsing for a product variant snapshot.
 *
 * This test authenticates a seller and then validates that the snapshot option
 * listing endpoint can represent an empty preserved-option collection with
 * correct pagination metadata.
 *
 * 1. Authenticate a seller with an isolated connection.
 * 2. Call the snapshot option listing endpoint with empty-list pagination input.
 * 3. Assert the response is an empty paginated page.
 */
export async function test_api_product_variant_snapshot_options_empty_history(
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
  const response =
    await api.functional.mallPlatform.seller.products.variantSnapshots.options.index(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductVariantSnapshotOption.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals("empty snapshot option data", response.data.length, 0);
  TestValidator.equals(
    "empty snapshot option records",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty snapshot option pages",
    response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty snapshot option limit",
    response.pagination.limit,
    10,
  );
}
