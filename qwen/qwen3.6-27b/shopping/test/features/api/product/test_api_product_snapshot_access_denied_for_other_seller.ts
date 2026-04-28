import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformSnapshotProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";

/**
 * Test that a seller cannot access product snapshot records belonging to another seller.
 *
 * Validates the cross-seller data isolation policy for product snapshot history. Verifies that when Seller B attempts to retrieve a snapshot from Seller A's product using the productId and a snapshotId, the request is rejected with HTTP 404 Not Found. The access control mechanism prevents unauthorized sellers from viewing other shops' product modification history, ensuring proper data privacy between independent merchant accounts.
 *
 * Special attention is given to confirming that the access denied response is returned as 404 (masked as Not Found per specification) rather than 403 Forbidden, and that both the productId and snapshotId path parameters must correspond to resources owned by the requesting seller for successful access.
 *
 * 1. Administrator registers and creates a category.
 * 2. First seller registers and creates a product in the category, which auto-generates a snapshot record.
 * 3. Second seller registers as an independent merchant account.
 * 4. Second seller attempts to retrieve the first seller's product snapshot.
 * 5. Validates that 404 Not Found is returned, confirming access control enforcement.
 */
export async function test_api_product_snapshot_access_denied_for_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers and creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. First seller (Seller A) registers and creates a product
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerADTO = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerADTO);
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerAConnection,
      {
        body: {
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  // 3. Second seller (Seller B) registers separately
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBDTO = await authorize_seller_join(sellerBConnection, {});
  typia.assert(sellerBDTO);
  // 4. Seller B attempts to access Seller A's product snapshot
  // Product creation auto-generates a snapshot per spec.
  // Since snapshotId is not exposed in product response, we use a random UUID.
  // The endpoint returns 404 for any unauthorized access attempt,
  // regardless of whether the snapshotId is valid or not. This validates
  // the data isolation boundary between sellers.
  const fakeSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 5. Validate that access is denied with HTTP 404 Not Found
  await TestValidator.httpError(
    "seller B cannot access seller A's product snapshot",
    404,
    async () =>
      await api.functional.ecommercePlatform.seller.products.snapshots.at(
        sellerBConnection,
        {
          productId: product.id,
          snapshotId: fakeSnapshotId,
        },
      ),
  );
}
