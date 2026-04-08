import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an authenticated administrator can retrieve a paginated list of all refund requests on the platform.
 *
 * Validates the complete refund request listing workflow for administrators including authentication, paginated data retrieval, and response structure verification. Ensures that the refund request list endpoint returns properly formatted pagination metadata and comprehensive refund request summaries with all related entity information.
 *
 * Special attention is given to verifying that the response includes complete customer details, nullable seller information (depending on request status), and order item details with product variant references. The test also validates the default sorting behavior and pagination structure.
 *
 * 1. Administrator authenticates via join operation with randomized credentials.
 * 2. Administrator calls the refund requests list endpoint without filters to retrieve all requests.
 * 3. Validates response contains pagination metadata (current page, limit, total records, total pages).
 * 4. Validates response data array contains refund request summaries with complete information.
 * 5. Verifies each refund request includes customer details, nullable seller info, and order item details.
 * 6. Confirms default sorting is by created_at descending when multiple records exist.
 */
export async function test_api_refund_request_list_all_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // 2. Retrieve all refund requests with default pagination
  const output =
    await api.functional.shoppingMall.administrator.refund_requests.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(output);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page is at least 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    output.pagination.pages >= 0,
  );
  // 4. Validate refund request summaries if data exists
  if (output.data.length > 0) {
    // Validate first refund request structure
    const firstRequest = output.data[0];
    // Verify refund request fields
    TestValidator.predicate(
      "refund request has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstRequest.id,
      ),
    );
    TestValidator.predicate(
      "refund request has non-empty reason",
      firstRequest.reason.length > 0,
    );
    TestValidator.predicate(
      "refund request has valid status",
      ["pending", "approved", "rejected"].includes(firstRequest.status),
    );
    TestValidator.predicate(
      "refund request has created_at timestamp",
      firstRequest.created_at.length > 0,
    );
    // Verify responded_at is null for pending, non-null for approved/rejected
    if (firstRequest.status === "pending") {
      TestValidator.equals(
        "responded_at is null for pending status",
        firstRequest.responded_at,
        null,
      );
    } else {
      TestValidator.predicate(
        "responded_at is not null for approved/rejected status",
        firstRequest.responded_at !== null,
      );
    }
    // Verify customer information
    TestValidator.predicate(
      "customer has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstRequest.customer.id,
      ),
    );
    TestValidator.predicate(
      "customer has valid email format",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firstRequest.customer.email),
    );
    TestValidator.predicate(
      "customer has display name",
      firstRequest.customer.display_name.length > 0,
    );
    TestValidator.predicate(
      "customer has banned boolean",
      typeof firstRequest.customer.banned === "boolean",
    );
    TestValidator.predicate(
      "customer has created_at timestamp",
      firstRequest.customer.created_at.length > 0,
    );
    // Verify seller information (nullable)
    if (firstRequest.seller !== null) {
      TestValidator.predicate(
        "seller has valid UUID when present",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          firstRequest.seller.id,
        ),
      );
      TestValidator.predicate(
        "seller has valid email format when present",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firstRequest.seller.email),
      );
      TestValidator.predicate(
        "seller profile has shop name when present",
        firstRequest.seller.seller_profile.shop_name.length > 0,
      );
    }
    // Verify order item information
    TestValidator.predicate(
      "order item has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstRequest.orderItem.id,
      ),
    );
    TestValidator.predicate(
      "order item has positive quantity",
      firstRequest.orderItem.quantity > 0,
    );
    TestValidator.predicate(
      "order item has positive price",
      firstRequest.orderItem.price > 0,
    );
    TestValidator.predicate(
      "order item has valid status",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        firstRequest.orderItem.status,
      ),
    );
    // Verify order item's product variant
    TestValidator.predicate(
      "product variant has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstRequest.orderItem.productVariant.id,
      ),
    );
    TestValidator.predicate(
      "product variant has SKU code",
      firstRequest.orderItem.productVariant.sku_code.length > 0,
    );
    TestValidator.predicate(
      "product variant has stock quantity",
      firstRequest.orderItem.productVariant.stock_quantity >= 0,
    );
    // Verify order item's order
    TestValidator.predicate(
      "order has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstRequest.orderItem.order.id,
      ),
    );
    TestValidator.predicate(
      "order has order number",
      firstRequest.orderItem.order.order_number.length > 0,
    );
    TestValidator.predicate(
      "order has valid status",
      [
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
        "partially_completed",
      ].includes(firstRequest.orderItem.order.status),
    );
    TestValidator.predicate(
      "order has positive total price",
      firstRequest.orderItem.order.total_price > 0,
    );
  }
  // 5. Verify default sorting (created_at descending) if multiple records
  if (output.data.length >= 2) {
    const sortedDescending = output.data.every((request, index) => {
      if (index === 0) return true;
      const previous = output.data[index - 1];
      return new Date(previous.created_at) >= new Date(request.created_at);
    });
    TestValidator.predicate(
      "refund requests are sorted by created_at descending",
      sortedDescending,
    );
  }
}
