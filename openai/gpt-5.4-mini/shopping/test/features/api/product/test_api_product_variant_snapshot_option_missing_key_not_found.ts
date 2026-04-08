import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
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
 * Verify that an option key missing from a product variant snapshot is reported as not found.
 *
 * This test authenticates a seller and calls the snapshot option lookup endpoint with a deliberately missing option key. Because no creation helpers are available in the provided API surface, the test focuses on the observable contract that a missing preserved option row must return a not-found response.
 *
 * The test does not attempt to fabricate snapshot history. Instead, it validates the endpoint's error handling for a missing option row and confirms the request is routed through the authenticated seller connection as required by the API surface.
 *
 * 1. Register and authenticate a seller account using the seller join utility.
 * 2. Request a snapshot option using randomized UUID parameters and a deliberately absent option key.
 * 3. Validate the endpoint responds with a not-found HTTP error.
 */
export async function test_api_product_variant_snapshot_option_missing_key_not_found(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `seller-${RandomGenerator.alphabets(8)}@test.com`,
      password: "Password123!",
    } satisfies IMallPlatformSeller.IJoin,
  });
  await TestValidator.httpError(
    "missing snapshot option key should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.seller.products.variants.snapshots.options.at(
        sellerConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          variantId: typia.random<string & tags.Format<"uuid">>(),
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
          optionKey: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
