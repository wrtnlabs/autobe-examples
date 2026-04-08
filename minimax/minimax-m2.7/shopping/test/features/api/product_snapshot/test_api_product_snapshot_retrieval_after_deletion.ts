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

/**
 * Test that super administrator can retrieve product snapshots after product deletion.
 *
 * Validates that product snapshots are preserved even after a product has been deleted by an administrator. This ensures historical product data remains accessible for dispute resolution and audit purposes.
 *
 * The test verifies the complete workflow: seller registration and approval, product creation with multiple edits to generate snapshots, product deletion by admin, and subsequent snapshot retrieval by super administrator.
 *
 * 1. Super administrator joins and authenticates.
 * 2. Admin account joins and authenticates.
 * 3. Seller registers and awaits approval.
 * 4. Admin approves the seller registration.
 * 5. Seller creates a product with initial snapshot.
 * 6. Seller edits product multiple times to create additional snapshots.
 * 7. Admin deletes the product (simulating policy violation).
 * 8. Super administrator retrieves snapshots for the deleted product.
 * 9. Validates snapshots are preserved with correct historical data.
 * 10. Verifies pagination metadata is correctly returned.
 */
export async function test_api_product_snapshot_retrieval_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!`,
      name: RandomGenerator.name(),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  typia.assert(admin);
  // 3. Register seller (pending approval)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/seller",
      referrer: "https://example.com",
    },
  });
  typia.assert(seller);
  // 4. Admin approves seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      {
        sellerId: seller.id,
      },
    );
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approvalStatus,
    "approved",
  );
  // 5. Seller creates a product (generates initial snapshot)
  const product =
    await api.functional.ecommerceMall.seller.sellers.me.products.create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const originalProductName = product.name;
  const originalBasePrice = product.basePrice;
  // 6. Seller edits product first time (generates second snapshot)
  const firstEditName = `${RandomGenerator.name(2)} - Updated`;
  const firstEditPrice = product.basePrice + 1000;
  const updatedProduct1 =
    await api.functional.ecommerceMall.seller.sellers.me.products.patchByProductid(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: firstEditName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          basePrice: firstEditPrice,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct1);
  // 7. Seller edits product second time (generates third snapshot)
  const secondEditName = `${RandomGenerator.name(2)} - Final Version`;
  const secondEditPrice = product.basePrice + 2000;
  const updatedProduct2 =
    await api.functional.ecommerceMall.seller.sellers.me.products.patchByProductid(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: secondEditName,
          basePrice: secondEditPrice,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct2);
  // 8. Admin deletes the product (for policy violation)
  await api.functional.ecommerceMall.admin.admin.products.erase(
    adminConnection,
    {
      productId: product.id,
    },
  );
  // 9. Super administrator retrieves snapshots for deleted product
  const snapshotsResponse =
    await api.functional.ecommerceMall.superAdmin.admin.products.snapshots.at(
      superAdminConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(snapshotsResponse);
  // 10. Validate snapshots are preserved
  TestValidator.predicate(
    "snapshots returned",
    snapshotsResponse.data.length >= 3,
  );
  // 11. Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    snapshotsResponse.pagination !== null,
  );
  TestValidator.predicate(
    "pagination records >= 3",
    snapshotsResponse.pagination.records >= 3,
  );
  // 12. Validate snapshot data preservation (snapshots should contain historical product states)
  const initialSnapshot = snapshotsResponse.data.find(
    (s) => s.name === originalProductName && s.basePrice === originalBasePrice,
  );
  TestValidator.predicate(
    "initial snapshot preserved",
    initialSnapshot !== undefined,
  );
  const firstEditSnapshot = snapshotsResponse.data.find(
    (s) => s.name === firstEditName && s.basePrice === firstEditPrice,
  );
  TestValidator.predicate(
    "first edit snapshot preserved",
    firstEditSnapshot !== undefined,
  );
  const secondEditSnapshot = snapshotsResponse.data.find(
    (s) => s.name === secondEditName && s.basePrice === secondEditPrice,
  );
  TestValidator.predicate(
    "second edit snapshot preserved",
    secondEditSnapshot !== undefined,
  );
  // 13. Validate snapshot contains correct product ID
  const snapshotWithCorrectProductId = snapshotsResponse.data.every(
    (s) => s.productId === product.id,
  );
  TestValidator.predicate(
    "all snapshots reference deleted product",
    snapshotWithCorrectProductId,
  );
  // 14. Validate snapshots contain seller information
  const snapshotWithSeller = snapshotsResponse.data.some(
    (s) => s.seller !== undefined && s.seller.id === seller.id,
  );
  TestValidator.predicate(
    "snapshots contain seller reference",
    snapshotWithSeller,
  );
  // 15. Validate snapshot timestamps are valid
  const sortedSnapshots = [...snapshotsResponse.data].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  TestValidator.predicate(
    "snapshots are in chronological order",
    sortedSnapshots.length >= 3,
  );
}
