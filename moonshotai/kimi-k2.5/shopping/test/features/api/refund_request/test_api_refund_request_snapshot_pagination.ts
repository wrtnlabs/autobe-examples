import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_refund_request_snapshot_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate all required actors with separate connections
  // 1.1 Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 1.2 Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 1.3 Authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Step 2: Create product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Step 3: Add product to cart as customer
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // Step 4: Retrieve refund request snapshots with pagination as admin
  // Note: Test assumes refund requests and snapshots already exist in the system
  // This tests the pagination mechanism for the admin review interface
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  // Step 4.1: First page request (limit=2, page=1)
  const firstPageRequest: IEcommerceMallRefundRequestSnapshot.IRequest = {
    status: null,
    reason: null,
    responseReason: null,
    createdAtFrom: null,
    createdAtTo: null,
    page: 1,
    limit: 2,
  };
  const firstPage =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: firstPageRequest,
      },
    );
  typia.assert(firstPage);
  // Validate first page pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 2);
  TestValidator.predicate(
    "first page records >= 0",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages >= 0",
    firstPage.pagination.pages >= 0,
  );
  // Validate data array length respects limit
  TestValidator.predicate(
    "first page data length <= limit",
    firstPage.data.length <= 2,
  );
  // Step 4.2: Second page request (limit=2, page=2)
  const secondPageRequest: IEcommerceMallRefundRequestSnapshot.IRequest = {
    status: null,
    reason: null,
    responseReason: null,
    createdAtFrom: null,
    createdAtTo: null,
    page: 2,
    limit: 2,
  };
  const secondPage =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: secondPageRequest,
      },
    );
  typia.assert(secondPage);
  // Validate second page pagination metadata
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 2);
  TestValidator.predicate(
    "second page records >= 0",
    secondPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "second page pages >= 0",
    secondPage.pagination.pages >= 0,
  );
  // Step 5: Business logic validations
  // 5.1: Validate total records consistency across pages
  TestValidator.equals(
    "total records consistency between pages",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  // 5.2: Validate total pages calculation
  const expectedPages = Math.ceil(firstPage.pagination.records / 2);
  TestValidator.equals(
    "total pages calculation",
    firstPage.pagination.pages,
    expectedPages,
  );
  TestValidator.equals(
    "pages consistency",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );
  // 5.3: If total records > 2, there should be potentially more pages
  if (firstPage.pagination.records > 2) {
    TestValidator.predicate(
      "has more pages when records > limit",
      firstPage.pagination.pages > 1,
    );
  }
  // Step 6: Test with different pagination parameters (larger limit)
  const largePageRequest: IEcommerceMallRefundRequestSnapshot.IRequest = {
    status: null,
    reason: null,
    responseReason: null,
    createdAtFrom: null,
    createdAtTo: null,
    page: 1,
    limit: 10,
  };
  const largePage =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: largePageRequest,
      },
    );
  typia.assert(largePage);
  // Validate larger limit request
  TestValidator.equals("large page limit", largePage.pagination.limit, 10);
  TestValidator.predicate(
    "large page data length <= 10",
    largePage.data.length <= 10,
  );
  // 6.1: Total records should be consistent regardless of limit
  TestValidator.equals(
    "total records consistency with different limits",
    largePage.pagination.records,
    firstPage.pagination.records,
  );
  // Step 7: Test filtering by status
  const statusFilteredRequest: IEcommerceMallRefundRequestSnapshot.IRequest = {
    status: "pending",
    reason: null,
    responseReason: null,
    createdAtFrom: null,
    createdAtTo: null,
    page: 1,
    limit: 5,
  };
  const statusFiltered =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: statusFilteredRequest,
      },
    );
  typia.assert(statusFiltered);
  // Validate filtered results
  TestValidator.predicate(
    "filtered total <= unfiltered total",
    statusFiltered.pagination.records <= firstPage.pagination.records,
  );
  // Step 8: Validate snapshot data structure for all returned items
  for (const snapshot of firstPage.data) {
    typia.assert<IEcommerceMallRefundRequestSnapshot>(snapshot);
  }
}
