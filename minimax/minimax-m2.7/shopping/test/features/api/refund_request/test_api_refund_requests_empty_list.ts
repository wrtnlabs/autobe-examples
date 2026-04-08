import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
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
 * Test that a newly approved seller with no refund requests receives an empty list response.
 *
 * This test validates the seller dashboard's refund requests endpoint when there are no
 * pending or historical refund requests. It verifies that the pagination metadata correctly
 * reflects zero records and that the response structure is valid.
 *
 * The test flow ensures the seller is properly registered, approved by an administrator,
 * and authenticated before checking for refund requests. Creating a product verifies the
 * seller has an approved account with full platform access.
 *
 * 1. Administrator registers and authenticates to approve sellers.
 * 2. Seller registers with pending status.
 * 3. Admin approves the seller registration.
 * 4. Seller authenticates with approved credentials.
 * 5. Seller creates a product to confirm full access.
 * 6. Seller retrieves refund requests list (should be empty).
 * 7. Validates empty data array and pagination metadata (records=0, pages=0).
 */
export async function test_api_refund_requests_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin for seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register seller (pending status) - store password for login
  const sellerPassword: string = RandomGenerator.alphaNumeric(16);
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller/register",
      referrer: "https://example.com",
    },
  });
  // 3. Admin approves the seller
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  // 4. Seller authenticates with approved credentials
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(approvedSellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller/login",
      referrer: "https://example.com/seller/register",
    },
  });
  // 5. Create product to verify seller has approved status and full access
  await generate_random_ecommerce_mall_seller_sellers_me_products_create(
    approvedSellerConnection,
    {},
  );
  // 6. Seller views refund requests (should be empty)
  const refundRequests =
    await api.functional.ecommerceMall.seller.sellers.me.refund_requests.get(
      approvedSellerConnection,
    );
  typia.assert(refundRequests);
  // 7. Validate empty list response structure
  TestValidator.equals(
    "data array should be empty",
    refundRequests.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be 0",
    refundRequests.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    refundRequests.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    refundRequests.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be positive",
    refundRequests.pagination.limit > 0,
  );
}
