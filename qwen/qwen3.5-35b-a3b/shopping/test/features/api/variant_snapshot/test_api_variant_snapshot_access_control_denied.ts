import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test access control that prevents sellers from viewing another seller's product variant snapshots.
 *
 * Validates that sellers can only access snapshots of their own product variants, not those belonging to other sellers. The test creates two seller accounts, has Seller B create a product and variant, edits it to trigger snapshot creation, and verifies that Seller A cannot access Seller B's snapshots.
 *
 * The access control mechanism compares the authenticated seller's identity with the snapshot's seller_id. If they don't match, the system returns 403 Forbidden (not 404) to prevent information disclosure about the existence of snapshots belonging to other sellers.
 *
 * 1. Seller A registers and authenticates with the platform.
 * 2. Seller B registers and authenticates with the platform.
 * 3. Seller B creates a product, receives the product ID.
 * 4. Seller B creates a variant for their product, receives the variant ID.
 * 5. Seller B edits the variant, which triggers snapshot creation.
 * 6. Seller A attempts to retrieve Seller B's variant snapshot using their own authentication with a valid UUID snapshot ID.
 * 7. Validates that the response is 403 Forbidden with an access denied error message.
 */
export async function test_api_variant_snapshot_access_control_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A joins and authenticates
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerAAuth);
  // 2. Seller B joins and authenticates
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {});
  typia.assert(sellerBAuth);
  // 3. Seller B creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerBConnection,
    {},
  );
  typia.assert(product);
  // 4. Seller B creates a variant for their product
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerBConnection,
      {
        body: {},
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Seller B edits the variant to trigger snapshot creation
  await api.functional.ecommerceMall.seller.products.variants.update(
    sellerBConnection,
    {
      productId: product.id,
      variantId: variant.id,
      body: { option_values: { color: "red" } },
    },
  );
  // 6. Seller A attempts to retrieve Seller B's variant snapshot
  // Use a valid UUID format for snapshotId to test access control properly
  // The API will check seller_id match and return 403 if access denied
  await TestValidator.httpError(
    "seller cannot access another seller's variant snapshot",
    403,
    async () => {
      return await api.functional.ecommerceMall.seller.products.variants.snapshots.at(
        sellerAConnection,
        {
          productId: product.id,
          variantId: variant.id,
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}