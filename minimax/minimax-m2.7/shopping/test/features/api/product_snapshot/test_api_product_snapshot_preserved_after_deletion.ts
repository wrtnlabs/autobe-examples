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
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test that product snapshots remain preserved and accessible even after a product has been deleted by an administrator for policy violations.
 *
 * Validates the complete snapshot preservation workflow including seller registration, product creation with multiple edits, administrative deletion, and subsequent snapshot retrieval. Ensures that product modification history is maintained for dispute resolution purposes even after the product is removed from the platform.
 *
 * Business Rule (Section 511, 514): Product snapshots must be preserved even after product deletion for dispute resolution purposes. When a product is deleted by an administrator for policy violations, all historical snapshots remain accessible to administrators for audit and dispute resolution.
 *
 * 1. Administrator registers an account on the platform.
 * 2. Seller registers an account with pending approval status using a known password.
 * 3. Administrator approves the seller registration.
 * 4. Approved seller authenticates with the known password and creates a product.
 * 5. Seller edits the product multiple times, each edit automatically creating a snapshot.
 * 6. Administrator authenticates and deletes the product for policy violation.
 * 7. Administrator retrieves product snapshots for the deleted product.
 * 8. Validates that snapshots are returned with complete historical product states.
 * 9. Validates that modification history is preserved regardless of deletion status.
 */
export async function test_api_product_snapshot_preserved_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register seller account with known password (pending approval)
  const sellerPassword = "TestSeller123!";
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      password: sellerPassword,
    },
  });
  // 3. Approve seller as administrator
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  // 4. Authenticate as approved seller using known password
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: "https://example.com/seller/login",
      referrer: "https://example.com/",
    },
  });
  // 5. Create a product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 6. Edit the product multiple times to create snapshot history
  // Each edit automatically creates a snapshot preserving the previous state
  await api.functional.ecommerceMall.seller.sellers.me.products.patchByProductid(
    sellerConnection,
    {
      productId: product.id,
      body: {
        name: `Updated Product ${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceMallProduct.IUpdate,
    },
  );
  await api.functional.ecommerceMall.seller.sellers.me.products.patchByProductid(
    sellerConnection,
    {
      productId: product.id,
      body: {
        basePrice: product.basePrice + 1000,
        description: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IEcommerceMallProduct.IUpdate,
    },
  );
  // 7. Delete the product as administrator for policy violation
  await api.functional.ecommerceMall.admin.admin.products.erase(
    adminConnection,
    {
      productId: product.id,
    },
  );
  // 8. Retrieve product snapshots for the deleted product
  const snapshotsPage =
    await api.functional.ecommerceMall.admin.admin.products.snapshots.at(
      adminConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(snapshotsPage);
  // 9. Validate snapshots are still accessible with pagination metadata
  TestValidator.predicate(
    "snapshots data array exists",
    snapshotsPage.data !== undefined,
  );
  TestValidator.predicate("snapshots returned", snapshotsPage.data.length > 0);
  TestValidator.equals(
    "pagination records count >= 3 (initial + 2 edits)",
    snapshotsPage.pagination.records >= 3,
    true,
  );
  // 10. Validate each snapshot contains complete product state
  for (const snapshot of snapshotsPage.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "snapshot id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
      true,
    );
    TestValidator.equals(
      "snapshot productId matches deleted product",
      snapshot.productId,
      product.id,
    );
    TestValidator.predicate("snapshot has name", snapshot.name.length > 0);
    TestValidator.predicate(
      "snapshot has description",
      snapshot.description.length > 0,
    );
    TestValidator.predicate(
      "snapshot has valid basePrice",
      snapshot.basePrice >= 0,
    );
    TestValidator.predicate(
      "snapshot has categoryName",
      snapshot.categoryName.length > 0,
    );
    TestValidator.predicate(
      "snapshot has seller reference",
      snapshot.seller !== undefined,
    );
    TestValidator.equals(
      "snapshot createdAt is valid date-time",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        snapshot.createdAt,
      ),
      true,
    );
  }
  // 11. Validate modification history is preserved (multiple snapshots from edits)
  TestValidator.predicate(
    "multiple snapshots exist from product creation and edits",
    snapshotsPage.data.length >= 3,
  );
  // Verify snapshots are ordered chronologically by createdAt
  for (let i = 1; i < snapshotsPage.data.length; i++) {
    const prevSnapshot = snapshotsPage.data[i - 1];
    const currSnapshot = snapshotsPage.data[i];
    TestValidator.predicate(
      `snapshot ${i} created before snapshot ${i + 1}`,
      prevSnapshot.createdAt <= currSnapshot.createdAt,
    );
  }
}
