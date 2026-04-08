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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Verifies seller-only access for inspecting preserved variant snapshot option history.
 *
 * This test ensures the variant snapshot option inspection endpoint does not leak dispute-sensitive historical data to unauthenticated or non-seller callers. It validates that the route rejects access before revealing whether the referenced product, snapshot, or option exists.
 *
 * A fresh seller session is created to establish the seller-role baseline, but the protected endpoint is intentionally invoked from a separate unauthenticated connection. The expected behavior is an authorization failure rather than a resource-existence response.
 *
 * 1. Create a valid seller session to establish the seller baseline for the scenario.
 * 2. Call the snapshot option endpoint from a non-seller connection without authorization.
 * 3. Assert that access is denied with an authorization-related HTTP error.
 */
export async function test_api_product_variant_snapshot_option_seller_access_required(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const optionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "seller variant snapshot option access requires authorization",
    [401, 403],
    async () =>
      await api.functional.mallPlatform.seller.products.variantSnapshots.options.at(
        unauthorizedConnection,
        {
          productId,
          snapshotId,
          optionId,
        },
      ),
  );
}
