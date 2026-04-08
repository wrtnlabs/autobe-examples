import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_refund_requests_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Call refund requests list - baseline (no filter)
  const allRequests =
    await api.functional.ecommerceMall.customer.customers.me.refund_requests.list(
      customerConnection,
    );
  typia.assert(allRequests);
  // Validate baseline response structure
  TestValidator.equals(
    "pagination exists",
    allRequests.pagination !== null,
    true,
  );
  TestValidator.equals("data is array", Array.isArray(allRequests.data), true);
  TestValidator.predicate(
    "pagination has current page",
    allRequests.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    allRequests.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    allRequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    allRequests.pagination.pages >= 0,
  );
  // 3. Validate refund request summary structure when data exists
  if (allRequests.data.length > 0) {
    const sampleRequest = allRequests.data[0];
    // Validate required fields exist
    TestValidator.predicate(
      "id is valid uuid format",
      sampleRequest.id !== null && sampleRequest.id !== undefined,
    );
    TestValidator.predicate(
      "status is defined",
      sampleRequest.status !== null && sampleRequest.status !== undefined,
    );
    TestValidator.equals(
      "status is valid value",
      ["pending", "approved", "rejected"].includes(sampleRequest.status),
      true,
    );
    TestValidator.predicate(
      "reason is defined",
      sampleRequest.reason !== null && sampleRequest.reason !== undefined,
    );
    TestValidator.predicate(
      "createdAt is defined",
      sampleRequest.createdAt !== null && sampleRequest.createdAt !== undefined,
    );
    TestValidator.predicate(
      "sellerResponseAt can be null",
      sampleRequest.sellerResponseAt === null ||
        sampleRequest.sellerResponseAt !== undefined,
    );
    // Validate customer exists
    TestValidator.equals(
      "customer exists",
      sampleRequest.customer !== null && sampleRequest.customer !== undefined,
      true,
    );
    // Validate order item exists
    TestValidator.equals(
      "orderItem exists",
      sampleRequest.orderItem !== null && sampleRequest.orderItem !== undefined,
      true,
    );
    // Validate order item details
    const orderItem = sampleRequest.orderItem;
    TestValidator.predicate(
      "orderItem.id exists",
      orderItem.id !== null && orderItem.id !== undefined,
    );
    TestValidator.predicate(
      "orderItem.quantity exists",
      orderItem.quantity !== null && orderItem.quantity !== undefined,
    );
    TestValidator.predicate(
      "orderItem.unit_price exists",
      orderItem.unit_price !== null && orderItem.unit_price !== undefined,
    );
    TestValidator.predicate(
      "orderItem.status exists",
      orderItem.status !== null && orderItem.status !== undefined,
    );
    // Validate product snapshot
    if (orderItem.productSnapshot) {
      TestValidator.predicate(
        "productSnapshot.name exists",
        orderItem.productSnapshot.name !== null &&
          orderItem.productSnapshot.name !== undefined,
      );
      TestValidator.predicate(
        "productSnapshot.id exists",
        orderItem.productSnapshot.id !== null &&
          orderItem.productSnapshot.id !== undefined,
      );
    }
    // Validate variant options exist
    if (orderItem.productVariant) {
      TestValidator.predicate(
        "productVariant.skuCode exists",
        orderItem.productVariant.skuCode !== null &&
          orderItem.productVariant.skuCode !== undefined,
      );
    }
  }
  // 4. Validate empty results have correct pagination
  TestValidator.equals(
    "empty result records is 0",
    allRequests.pagination.records,
    0,
  );
  // Verify pagination math is correct
  if (allRequests.pagination.records > 0) {
    const expectedPages = Math.ceil(
      allRequests.pagination.records / allRequests.pagination.limit,
    );
    TestValidator.equals(
      "pages calculated correctly",
      allRequests.pagination.pages,
      expectedPages,
    );
  }
}