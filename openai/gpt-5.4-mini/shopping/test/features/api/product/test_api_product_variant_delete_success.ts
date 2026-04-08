import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_product_variant_delete_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Delete a seller-owned product variant when no blocking dependencies exist.
   *
   * Verifies the happy-path variant deletion flow for a seller account by first
   * authenticating a fresh seller session and then invoking the variant delete
   * endpoint with valid UUID identifiers. The test focuses on the successful
   * removal request itself because the provided API surface only includes the
   * deletion operation for this scenario.
   *
   * 1. Register and authenticate a fresh seller account.
   * 2. Use the authenticated seller connection to invoke variant deletion.
   * 3. Confirm the delete operation completes without throwing an error.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  await api.functional.mallPlatform.seller.products.variants.erase(
    sellerConnection,
    {
      productId: typia.random<string & tags.Format<"uuid">>(),
      variantId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
}
