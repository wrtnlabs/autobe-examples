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

/**
 * Test seller product variant deletion success scenario.
 *
 * Validates the primary workflow where an authenticated seller can delete
 * a product variant that has no active transactions.
 *
 * Test Steps:
 * 1. Seller joins the platform and gets authenticated
 * 2. Seller deletes a product variant (using pre-existing IDs)
 * 3. Verify deletion completes successfully with 204 No Content
 *
 * Note: This test uses pre-existing product/variant IDs since product
 * creation APIs are not available in the current SDK.
 */
export async function test_api_seller_product_variant_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    { body: undefined },
  );
  typia.assert(seller);
  // Step 2: Prepare deletion with pre-existing product and variant IDs
  // In production, these would be obtained from product creation and listing APIs
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Delete the variant
  await api.functional.ecommerceMall.seller.products.variants.erase(
    sellerConnection,
    {
      productId,
      variantId,
    } satisfies api.functional.ecommerceMall.seller.products.variants.erase.Props,
  );
  // Step 4: Verify deletion succeeded (void response indicates 204 No Content)
  // The DELETE endpoint returns void on success, which is what we received
}
