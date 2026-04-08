import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test that a seller cannot view product snapshots belonging to another seller.
 *
 * Validates the access control rule that only the product owner can view their
 * product snapshots. This endpoint is used for dispute resolution, so only the
 * seller who owns the product should be able to access its modification history.
 *
 * Business rule: Product snapshots contain sensitive historical data that should
 * only be accessible to the product owner. Other sellers must receive 403
 * Forbidden when attempting to view snapshots of products they don't own.
 *
 * 1. Register and authenticate as Seller A (first seller).
 * 2. Admin creates a category for product assignment.
 * 3. Seller A creates a product (automatically generates initial snapshot).
 * 4. Register and authenticate as Seller B (different seller account).
 * 5. Seller B attempts to view Seller A's product snapshots.
 * 6. System returns 403 Forbidden error indicating access is denied.
 * 7. Validates that Seller B cannot view modification history of products they do not own.
 */
export async function test_api_product_snapshot_access_denied_to_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerA);
  // 2. Admin creates a category for product assignment
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller A creates a product (automatically generates initial snapshot)
  const sellerAProductConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerAProductConnection, {
    body: {
      email: sellerA.email,
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerAProductConnection,
      {
        body: {
          categoryId: category.id,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          name: RandomGenerator.name(2),
          basePrice: RandomGenerator.sample(
            [1000, 2000, 3000, 5000, 10000],
            1,
          )[0],
        },
      },
    );
  typia.assert(product);
  // 4. Register and authenticate as Seller B (different seller account)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {});
  typia.assert(sellerB);
  // 5. Seller B attempts to view Seller A's product snapshots
  // 6. System returns 403 Forbidden error indicating access is denied
  await TestValidator.httpError(
    "Seller B cannot access Seller A's product snapshots",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.products.snapshots(
        sellerBConnection,
        {
          productId: product.id,
        },
      );
    },
  );
}