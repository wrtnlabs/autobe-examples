import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshotVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test seller access denied when attempting to view another seller's variant snapshots.
 *
 * Validates that a seller cannot access variant snapshot history of products
 * belonging to other sellers. The system enforces ownership validation where
 * only the product owner can view variant edit history.
 *
 * This test ensures proper authorization boundaries between sellers on the
 * multi-vendor e-commerce platform. When a seller attempts to access variant
 * snapshots of another seller's product, the system must return HTTP 403 Forbidden
 * to prevent unauthorized data access.
 *
 * 1. Administrator joins and authenticates on the platform.
 * 2. First seller registers, gets approved, and creates a product with a variant.
 * 3. Second seller registers and gets approved by admin.
 * 4. Second seller attempts to access first seller's variant snapshots.
 * 5. System returns HTTP 403 Forbidden - access denied.
 *
 * The variant snapshots endpoint is protected by seller ownership validation,
 * ensuring each seller can only view edit history of their own product variants.
 */
export async function test_api_variant_snapshot_access_denied_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin for seller approvals
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. First seller registration and approval
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Password = RandomGenerator.alphaNumeric(16);
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Admin approves first seller
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: seller1Auth.id,
    },
  );
  // First seller authenticates after approval
  const seller1LoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(seller1LoginConnection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // First seller creates product and variant
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      seller1LoginConnection,
      {},
    );
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      seller1LoginConnection,
      {
        params: { productId: product.id },
      },
    );
  // 3. Second seller registration and approval
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Password = RandomGenerator.alphaNumeric(16);
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Admin approves second seller
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: seller2Auth.id,
    },
  );
  // Second seller authenticates
  const seller2LoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(seller2LoginConnection, {
    body: {
      email: seller2Email,
      password: seller2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Second seller attempts to access first seller's variant snapshots
  // Expected: HTTP 403 Forbidden - seller does not own this product
  await TestValidator.httpError(
    "second seller cannot access first seller's variant snapshots",
    403,
    async () =>
      await api.functional.ecommerceMall.seller.sellers.me.products.variants.snapshots.list(
        seller2LoginConnection,
        {
          productId: product.id,
          variantId: variant.id,
        },
      ),
  );
}
