import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Browse seller order items with pagination and operational summary data.
 *
 * Validates that the seller-only order-item browsing endpoint returns a paginated
 * summary list suitable for fulfillment triage. The test checks pagination
 * metadata, nested order/product variant/seller summaries, and the default
 * newest-first ordering behavior when multiple rows are available.
 *
 * 1. Authenticate as a seller using the seller join utility and an isolated
 *    connection.
 * 2. Query the seller order-item browse endpoint with explicit page and limit.
 * 3. Validate pagination metadata and the compact summary projection.
 * 4. Confirm returned rows expose stable order-item identity, quantity, status,
 *    timestamps, and nested summaries.
 * 5. When at least two rows are returned, verify newest-first ordering by
 *    created timestamp.
 */
export async function test_api_order_items_paginated_browse(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const response = await api.functional.mallPlatform.seller.orderItems.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 5,
        status: "paid",
      } satisfies IMallPlatformOrderItem.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  for (const item of response.data) {
    TestValidator.predicate("order item id exists", item.id.length > 0);
    TestValidator.predicate("quantity is positive", item.quantity > 0);
    TestValidator.predicate("status exists", item.status.length > 0);
    TestValidator.predicate("created_at exists", item.created_at.length > 0);
    TestValidator.predicate("updated_at exists", item.updated_at.length > 0);
    TestValidator.predicate("order summary exists", item.order.id.length > 0);
    TestValidator.predicate(
      "product variant summary exists",
      item.productVariant.id.length > 0,
    );
    TestValidator.predicate("seller summary exists", item.seller.id.length > 0);
    TestValidator.predicate(
      "order customer summary exists",
      item.order.customer.id.length > 0,
    );
    TestValidator.predicate(
      "product summary seller exists",
      item.productVariant.product.sellerAccount.id.length > 0,
    );
  }
  if (response.data.length >= 2) {
    TestValidator.predicate(
      "newest-first ordering by created_at",
      response.data[0].created_at >= response.data[1].created_at,
    );
  }
}
