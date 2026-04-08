import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
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

export async function test_api_product_variant_update_product_scope_protection(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test product-scope protection for seller variant updates.
   *
   * Verifies that the seller variant update endpoint rejects requests that do
   * not belong to the authenticated seller's product scope. The test focuses on
   * access control and route-level ownership enforcement for variant edits.
   *
   * 1. Register a seller account and authenticate with a dedicated connection.
   * 2. Attempt to update a variant through an unrelated product/variant route.
   * 3. Confirm the platform rejects the request with an authorization or not-
   *    found error.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const requestBody = {
    sku_code: RandomGenerator.alphaNumeric(12),
    option_values: RandomGenerator.name(2),
    price_override: null,
  } satisfies IMallPlatformProductVariant.IUpdate;
  await TestValidator.httpError(
    "seller variant update should reject an unrelated product/variant scope",
    [403, 404],
    async () => {
      await api.functional.mallPlatform.seller.products.variants.update(
        sellerConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          variantId: typia.random<string & tags.Format<"uuid">>(),
          body: requestBody,
        },
      );
    },
  );
}
