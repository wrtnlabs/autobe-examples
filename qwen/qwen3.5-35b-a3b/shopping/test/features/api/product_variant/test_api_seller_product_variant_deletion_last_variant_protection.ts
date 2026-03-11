import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_variant_deletion_last_variant_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  typia.assert(sellerAuthorized);
  // sellerConnection.headers is updated internally by authorize function
  // Use sellerConnection directly for API calls
  // 2. Attempt to delete a product variant (will be the last one)
  // Using random UUIDs since we don't have product/variant creation endpoints
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Verify deletion fails with 409 Conflict for last variant protection
  await TestValidator.error(
    "last variant deletion should fail with 409 Conflict",
    async () => {
      await api.functional.ecommerceMall.seller.products.variants.erase(
        sellerConnection,
        { productId, variantId },
      );
    },
  );
  // 4. Verify error message indicates at least one variant must remain
  // TestValidator.httpError validates both status and error content
  await TestValidator.httpError(
    "error message should mention last variant protection",
    409,
    async () => {
      await api.functional.ecommerceMall.seller.products.variants.erase(
        sellerConnection,
        { productId, variantId },
      );
    },
  );
}
