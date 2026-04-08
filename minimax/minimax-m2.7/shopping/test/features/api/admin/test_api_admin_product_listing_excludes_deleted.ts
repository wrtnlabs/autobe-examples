import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
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
 * Test that admin product listing endpoint filters out soft-deleted products.
 *
 * Validates the administrative product oversight functionality by ensuring that when a product is deleted (soft-deleted) by an administrator, it no longer appears in the paginated product listing. This test covers the complete lifecycle: admin authentication, seller approval workflow, product creation, product deletion, and listing verification.
 *
 * The test verifies that the soft-delete mechanism works correctly by:
 * 1. Creating an admin account for authentication and product management
 * 2. Registering and approving a seller who can create products
 * 3. Creating a product as the approved seller
 * 4. Confirming the product appears in admin listing before deletion
 * 5. Deleting the product via admin endpoint (soft-delete)
 * 6. Verifying the deleted product is excluded from subsequent listings
 * 7. Confirming pagination metadata reflects the reduced product count
 *
 * This ensures data integrity in admin oversight operations and proper filtering of inactive products.
 */
export async function test_api_admin_product_listing_excludes_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication and product management
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
  // 2. Create seller account for product creation
  // The join function authenticates and sets token on the connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId: sellerAuth.id },
    );
  typia.assert(approvedSeller);
  // 4. Create a product as the approved seller
  // sellerConnection already has auth token from authorize_seller_join
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 5. Verify product appears in admin listing BEFORE deletion
  const listingBeforeDelete =
    await api.functional.ecommerceMall.admin.admin.products.list(
      adminConnection,
    );
  typia.assert(listingBeforeDelete);
  const productExistsBefore = listingBeforeDelete.data.some(
    (p) => p.id === product.id,
  );
  TestValidator.equals(
    "product exists in listing before delete",
    productExistsBefore,
    true,
  );
  const recordsBeforeDelete = listingBeforeDelete.pagination.records;
  // 6. Delete the product via admin endpoint (soft-delete)
  await api.functional.ecommerceMall.admin.admin.products.erase(
    adminConnection,
    {
      productId: product.id,
    },
  );
  // 7. Verify product does NOT appear in admin listing AFTER deletion
  const listingAfterDelete =
    await api.functional.ecommerceMall.admin.admin.products.list(
      adminConnection,
    );
  typia.assert(listingAfterDelete);
  const productExistsAfter = listingAfterDelete.data.some(
    (p) => p.id === product.id,
  );
  TestValidator.equals(
    "product excluded from listing after delete",
    productExistsAfter,
    false,
  );
  // 8. Verify pagination metadata reflects reduced product count
  TestValidator.predicate(
    "pagination records decreased after deletion",
    listingAfterDelete.pagination.records < recordsBeforeDelete,
  );
}
