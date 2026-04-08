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
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_snapshot_superadmin_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Register an admin account to approve seller
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 4. Admin approves the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId: seller.id },
    );
  typia.assert(approvedSeller);
  // 5. Seller creates a product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  const originalName = product.name;
  const originalDescription = product.description;
  const originalPrice = product.basePrice;
  // 6. Seller edits the product multiple times to create snapshots
  // First edit - change name
  const updatedName = `${originalName} - Updated Version 1`;
  const productV1 =
    await api.functional.ecommerceMall.seller.sellers.me.products.patchByProductid(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: updatedName,
          description: originalDescription,
          basePrice: originalPrice,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(productV1);
  // Second edit - change description
  const updatedDescription = `${originalDescription} - Modified description for testing snapshots.`;
  const productV2 =
    await api.functional.ecommerceMall.seller.sellers.me.products.patchByProductid(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: updatedName,
          description: updatedDescription,
          basePrice: originalPrice,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(productV2);
  // Third edit - change price
  const updatedPrice = originalPrice + 100;
  const productV3 =
    await api.functional.ecommerceMall.seller.sellers.me.products.patchByProductid(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: updatedName,
          description: updatedDescription,
          basePrice: updatedPrice,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(productV3);
  // 7. Super admin retrieves product snapshots
  const snapshotsPage =
    await api.functional.ecommerceMall.superAdmin.admin.products.snapshots.at(
      superAdminConnection,
      { productId: product.id },
    );
  typia.assert(snapshotsPage);
  // 8. Validate pagination metadata
  TestValidator.equals(
    "pagination exists",
    snapshotsPage.pagination !== null,
    true,
  );
  TestValidator.equals(
    "current page is 1",
    snapshotsPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is positive",
    snapshotsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is at least 3",
    snapshotsPage.pagination.records >= 3,
  );
  TestValidator.predicate(
    "pages count is at least 1",
    snapshotsPage.pagination.pages >= 1,
  );
  // 9. Validate snapshots list
  TestValidator.predicate(
    "has at least 3 snapshots",
    snapshotsPage.data.length >= 3,
  );
  // 10. Verify snapshots are ordered chronologically (oldest first)
  for (let i = 1; i < snapshotsPage.data.length; i++) {
    const prevSnapshot = snapshotsPage.data[i - 1];
    const currSnapshot = snapshotsPage.data[i];
    const prevTime = new Date(prevSnapshot.createdAt).getTime();
    const currTime = new Date(currSnapshot.createdAt).getTime();
    TestValidator.predicate(
      `snapshot ${i} createdAt is after snapshot ${i - 1}`,
      currTime >= prevTime,
    );
  }
  // 11. Validate each snapshot contains required fields
  for (let i = 0; i < snapshotsPage.data.length; i++) {
    const snapshot = snapshotsPage.data[i];
    TestValidator.equals(`snapshot ${i} has id`, snapshot.id !== null, true);
    TestValidator.equals(
      `snapshot ${i} has productId`,
      snapshot.productId === product.id,
      true,
    );
    TestValidator.equals(
      `snapshot ${i} has name`,
      snapshot.name !== null,
      true,
    );
    TestValidator.equals(
      `snapshot ${i} has description`,
      snapshot.description !== null,
      true,
    );
    TestValidator.predicate(
      `snapshot ${i} has valid basePrice`,
      snapshot.basePrice >= 0,
    );
    TestValidator.equals(
      `snapshot ${i} has categoryName`,
      snapshot.categoryName !== null,
      true,
    );
    TestValidator.equals(
      `snapshot ${i} has createdAt`,
      snapshot.createdAt !== null,
      true,
    );
    TestValidator.equals(
      `snapshot ${i} has seller info`,
      snapshot.seller !== null,
      true,
    );
  }
  // 12. Verify snapshots preserve historical state
  // The first snapshot should have the original name
  const firstSnapshot = snapshotsPage.data[0];
  TestValidator.equals(
    "first snapshot has original name",
    firstSnapshot.name,
    originalName,
  );
  // Verify seller info is preserved in snapshots
  TestValidator.equals(
    "seller email matches",
    firstSnapshot.seller.email,
    seller.email,
  );
}
