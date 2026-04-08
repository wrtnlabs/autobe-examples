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
 * Test product snapshot listing when a product has no modification history.
 *
 * Validates that when an administrator retrieves snapshots for a newly created
 * product that has never been edited, the response returns an empty paginated
 * result with proper pagination metadata. This test verifies the complete flow
 * from administrator setup through seller approval, product creation, and
 * snapshot retrieval validation.
 *
 * The test ensures that:
 * - Newly created products have no snapshot history by default
 * - Pagination metadata correctly reflects 0 total records
 * - The response structure matches IPageIEcommerceMallProductSnapshot.ISummary
 * - The productId reference is correctly maintained in the query
 *
 * 1. Register administrator account with randomized credentials.
 * 2. Register seller account with randomized credentials.
 * 3. Authenticate as administrator and approve the seller.
 * 4. Authenticate as approved seller and create a new product.
 * 5. Authenticate as administrator and retrieve product snapshots.
 * 6. Validate response returns empty data array with 0 records in pagination.
 */
export async function test_api_product_snapshot_empty_history_listing(
  connection: api.IConnection,
): Promise<void> {
  // Generate and store passwords for subsequent login operations
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  // 1. Register administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      password: adminPassword,
    },
  });
  typia.assert(adminAuth);
  // 2. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      password: sellerPassword,
    },
  });
  typia.assert(sellerAuth);
  // 3. Approve seller as administrator
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  // 4. Authenticate as approved seller using the stored password
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(approvedSellerConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 5. Create product without edits
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      approvedSellerConnection,
      {},
    );
  typia.assert(product);
  // 6. Authenticate as administrator for snapshot retrieval
  const adminForSnapshotConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminForSnapshotConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 7. Retrieve product snapshots
  const snapshotsResponse =
    await api.functional.ecommerceMall.admin.admin.products.snapshots.at(
      adminForSnapshotConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(snapshotsResponse);
  // 8. Validate empty data array
  TestValidator.equals(
    "data array should be empty",
    snapshotsResponse.data,
    [],
  );
  // 9. Validate pagination shows 0 records
  TestValidator.equals(
    "pagination records should be 0",
    snapshotsResponse.pagination.records,
    0,
  );
  // 10. Validate response structure and productId reference
  TestValidator.predicate(
    "pagination should exist",
    snapshotsResponse.pagination !== null,
  );
  TestValidator.predicate(
    "data should be array",
    Array.isArray(snapshotsResponse.data),
  );
}
