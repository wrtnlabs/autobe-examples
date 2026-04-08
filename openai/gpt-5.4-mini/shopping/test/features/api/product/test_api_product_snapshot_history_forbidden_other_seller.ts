import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Rejects access to a product's snapshot history when requested by a different seller.
 *
 * Verifies the access-control boundary for seller-scoped snapshot browsing by creating two distinct seller accounts and attempting to read a product snapshot history from the second seller's authenticated session.
 *
 * This test focuses on the authorization rule for preserved product state access. It ensures that only the owning seller or administrators can browse snapshot history, and that a non-owner seller receives a forbidden response when calling the snapshot history endpoint.
 *
 * 1. Register and authenticate the first seller.
 * 2. Register and authenticate a different seller.
 * 3. Attempt to access snapshot history from the non-owner seller session.
 * 4. Validate that the request is rejected as forbidden.
 */
export async function test_api_product_snapshot_history_forbidden_other_seller(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_seller_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(owner);
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSeller = await authorize_seller_join(otherSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(otherSeller);
  await TestValidator.httpError(
    "other seller cannot access the owner's product snapshot history",
    403,
    async () => {
      await api.functional.mallPlatform.seller.products.snapshots.index(
        otherSellerConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
          } satisfies IMallPlatformProductSnapshot.IRequest,
        },
      );
    },
  );
}
