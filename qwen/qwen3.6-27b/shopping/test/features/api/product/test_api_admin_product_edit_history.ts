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
import type { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshot";
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
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";

/**
 * Test admin retrieval of product edit history via snapshots.
 *
 * Validates the complete product audit trail workflow including seller product creation, product modification that triggers snapshot generation, and administrative retrieval of the immutable edit history. Ensures that product changes are captured as snapshots and accessible by platform administrators for audit purposes.
 *
 * The test verifies that snapshots are correctly generated when a seller updates product details, and that administrators can query the snapshot history with proper pagination metadata. Special attention is given to confirming the entityType field correctly identifies product-related snapshots.
 *
 * 1. Seller joins the platform and authenticates.
 * 2. Seller creates a new product with initial name, description, base price, and category.
 * 3. Seller updates the product, changing name and description to trigger snapshot.
 * 4. Admin joins the platform and authenticates.
 * 5. Admin retrieves the paginated list of edit snapshots for the product.
 * 6. Validates snapshot list contains entries with correct entity type.
 */
export async function test_api_admin_product_edit_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Seller creates a product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Seller updates the product (triggers snapshot creation)
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEcommercePlatformProduct.IUpdate;
  const updatedProduct =
    await api.functional.ecommercePlatform.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: updateBody,
      },
    );
  typia.assert(updatedProduct);
  // 4. Admin joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 5. Admin retrieves product edit snapshots
  const request = {
    entityType: "product" as const,
    page: 1 satisfies number as number,
    limit: 20 satisfies number as number,
  } satisfies IEcommercePlatformSnapshot.IRequest;
  const snapshots =
    await api.functional.ecommercePlatform.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: request,
      },
    );
  typia.assert(snapshots);
  // 6. Validate snapshot data
  TestValidator.predicate(
    "snapshots data array is not empty",
    snapshots.data.length > 0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    snapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has positive record count",
    snapshots.pagination.records > 0,
  );
  TestValidator.equals(
    "snapshot entity type is product",
    snapshots.data[0].entityType,
    "product",
  );
}
