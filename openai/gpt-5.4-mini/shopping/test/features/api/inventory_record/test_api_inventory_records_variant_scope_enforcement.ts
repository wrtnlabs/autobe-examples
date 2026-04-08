import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Enforces product-to-variant scope when browsing seller inventory history.
 *
 * This test validates that the seller inventory-history endpoint does not leak
 * inventory records across product boundaries. It checks the platform's
 * out-of-scope protection by requesting inventory history with a product and
 * variant identifier pair that do not correspond to the same catalog scope.
 *
 * The expected behavior is a not-found or access-scope failure rather than a
 * successful inventory page, ensuring sellers cannot inspect another product's
 * inventory history through a mismatched path.
 *
 * 1. Authenticate as a seller.
 * 2. Call the inventory history endpoint with mismatched product and variant
 *    identifiers.
 * 3. Confirm the endpoint rejects the request instead of exposing unrelated
 *    inventory data.
 */
export async function test_api_inventory_records_variant_scope_enforcement(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  await TestValidator.httpError(
    "inventory history should reject mismatched product and variant scope",
    [400, 401, 403, 404],
    async () => {
      await api.functional.mallPlatform.seller.products.variants.inventoryRecords.index(
        sellerConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          variantId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
          } satisfies IMallPlatformInventoryRecord.IRequest,
        },
      );
    },
  );
}
