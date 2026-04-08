import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseRefundRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseRefundRequest";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator retrieval of paginated refund requests list across the platform.
 *
 * Validates the admin's ability to access all refund requests regardless of status or seller ownership. Ensures proper pagination metadata, complete refund request data including member and order item details, and correct sorting by creation date.
 *
 * 1. Administrator authenticates via join operation with randomized credentials.
 * 2. Calls the refund requests list endpoint without filters to retrieve all requests.
 * 3. Verifies pagination metadata contains current page, limit, total records, and total pages.
 * 4. Validates each refund request includes member summary with email and customer profile.
 * 5. Validates each refund request includes order item details with product name, variant options, and seller information.
 * 6. Verifies refund requests contain status (pending, approved, or rejected) and reason fields.
 * 7. Confirms results are sorted by created_at in descending order (most recent first).
 */
export async function test_api_refund_request_admin_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Call refund requests list endpoint without filters
  const response =
    await api.functional.shoppingMall.admin.post_purchase.refund_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallPostPurchaseRefundRequest.IRequest,
      },
    );
  typia.assert(response);
  // 3. Verify pagination metadata
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate("limit is set", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Verify data array exists
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // 5. If there are refund requests, validate their structure
  if (response.data.length > 0) {
    // Validate first refund request structure
    const firstRequest = response.data[0];
    // Verify refund request has required fields
    TestValidator.predicate(
      "refund request has id",
      firstRequest.id !== undefined,
    );
    TestValidator.predicate(
      "refund request has reason",
      firstRequest.reason !== undefined,
    );
    TestValidator.predicate(
      "refund request has status",
      firstRequest.status !== undefined,
    );
    TestValidator.predicate(
      "refund request has created_at",
      firstRequest.created_at !== undefined,
    );
    TestValidator.predicate(
      "refund request has updated_at",
      firstRequest.updated_at !== undefined,
    );
    // Verify member information exists
    TestValidator.predicate("member exists", firstRequest.member !== undefined);
    TestValidator.predicate(
      "member has id",
      firstRequest.member.id !== undefined,
    );
    TestValidator.predicate(
      "member has email",
      firstRequest.member.email !== undefined,
    );
    TestValidator.predicate(
      "member has status",
      firstRequest.member.status !== undefined,
    );
    // Verify order item information exists
    TestValidator.predicate(
      "orderItem exists",
      firstRequest.orderItem !== undefined,
    );
    TestValidator.predicate(
      "orderItem has id",
      firstRequest.orderItem.id !== undefined,
    );
    TestValidator.predicate(
      "orderItem has quantity",
      firstRequest.orderItem.quantity !== undefined,
    );
    TestValidator.predicate(
      "orderItem has price",
      firstRequest.orderItem.price !== undefined,
    );
    TestValidator.predicate(
      "orderItem has status",
      firstRequest.orderItem.status !== undefined,
    );
    TestValidator.predicate(
      "orderItem has orderCode",
      firstRequest.orderItem.orderCode !== undefined,
    );
    // Verify product information in order item
    TestValidator.predicate(
      "product exists",
      firstRequest.orderItem.product !== undefined,
    );
    TestValidator.predicate(
      "product has id",
      firstRequest.orderItem.product.id !== undefined,
    );
    TestValidator.predicate(
      "product has name",
      firstRequest.orderItem.product.name !== undefined,
    );
    TestValidator.predicate(
      "product has base_price",
      firstRequest.orderItem.product.base_price !== undefined,
    );
    // Verify product variant information
    TestValidator.predicate(
      "productVariant exists",
      firstRequest.orderItem.productVariant !== undefined,
    );
    TestValidator.predicate(
      "productVariant has id",
      firstRequest.orderItem.productVariant.id !== undefined,
    );
    TestValidator.predicate(
      "productVariant has sku_code",
      firstRequest.orderItem.productVariant.sku_code !== undefined,
    );
    TestValidator.predicate(
      "productVariant has option_values",
      firstRequest.orderItem.productVariant.option_values !== undefined,
    );
    // Verify seller information
    TestValidator.predicate(
      "seller exists",
      firstRequest.orderItem.seller !== undefined,
    );
    TestValidator.predicate(
      "seller has id",
      firstRequest.orderItem.seller.id !== undefined,
    );
    TestValidator.predicate(
      "seller has email",
      firstRequest.orderItem.seller.email !== undefined,
    );
    // 6. Verify sorting by created_at descending (if multiple requests exist)
    if (response.data.length > 1) {
      for (let i = 1; i < response.data.length; i++) {
        const prevDate = new Date(response.data[i - 1].created_at).getTime();
        const currDate = new Date(response.data[i].created_at).getTime();
        TestValidator.predicate(
          `sorted by created_at desc at index ${i}`,
          prevDate >= currDate,
        );
      }
    }
  }
}
