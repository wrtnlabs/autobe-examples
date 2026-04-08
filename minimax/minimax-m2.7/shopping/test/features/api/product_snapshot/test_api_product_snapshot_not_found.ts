import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test 404 Not Found error handling when retrieving non-existent product snapshots.
 *
 * Validates proper error handling for the product snapshot retrieval endpoint by testing
 * various scenarios where the requested resource does not exist. The endpoint should
 * return appropriate 404 status codes with meaningful error messages.
 *
 * **Test Scenarios:**
 *
 * 1. **Non-existent Snapshot**: Request with valid productId but random non-existent snapshotId
 *    - Should return 404 Not Found with message indicating snapshot not found
 *
 * 2. **Non-existent Product**: Request with random non-existent productId
 *    - Should return 404 Not Found with message indicating product not found
 *
 * 3. **Both Non-existent**: Request with both non-existent productId and snapshotId
 *    - Should return 404 Not Found
 *
 * **Setup Flow:**
 * 1. Create and authenticate admin account
 * 2. Admin creates a category
 * 3. Seller creates a product (auto-creates initial snapshot)
 * 4. Test 404 scenarios with non-existent UUIDs
 *
 * @param connection Base API connection
 */
export async function test_api_product_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // === 1. Setup: Create and authenticate admin ===
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // === 2. Create seller account ===
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // === 3. Seller login ===
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(approvedSellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // === 4. Create category ===
  const category =
    await api.functional.ecommerceMall.admin.admin.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // === 5. Create product (auto-generates snapshot) ===
  const product =
    await api.functional.ecommerceMall.seller.sellers.me.products.create(
      approvedSellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: category.id,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // === Test Scenario 1: Non-existent snapshotId with valid productId ===
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent snapshot should return 404",
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.products._snapshots.at(
        approvedSellerConnection,
        {
          productId: product.id,
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );
  // === Test Scenario 2: Non-existent productId with valid snapshotId ===
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent product should return 404",
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.products._snapshots.at(
        approvedSellerConnection,
        {
          productId: nonExistentProductId,
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );
  // === Test Scenario 3: Both productId and snapshotId are non-existent ===
  await TestValidator.error("both non-existent should return 404", async () => {
    await api.functional.ecommerceMall.seller.sellers.me.products._snapshots.at(
      approvedSellerConnection,
      {
        productId: nonExistentProductId,
        snapshotId: nonExistentSnapshotId,
      },
    );
  });
}
