import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShoppingCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformShoppingCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test authenticated customer cart items listing with computed line subtotals and stock availability validation.
 *
 * Validates that the shopping cart listing endpoint returns properly paginated results with accurate computed line subtotals and real-time stock availability status. Each cart item's line_subtotal must equal the product of quantity and the effective price, where the effective price is the variant's specific price when set, otherwise the parent product's base price. The stock_availability boolean must reflect the actual inventory ledger state.
 *
 * Special attention is given to the pricing fallback logic when variant price is null, default ordering by creation timestamp in descending order, and pagination metadata consistency including total record counts and page calculations.
 *
 * 1. Register and authenticate a new customer account with random credentials and session context.
 * 2. Request cart items with explicit pagination parameters (limit=5, page=1).
 * 3. Validate the paginated response structure and metadata against request parameters.
 * 4. For each cart item, verify line_subtotal equals quantity multiplied by variant price or product base price fallback.
 * 5. Confirm stock_availability accurately reflects inventory ledger stock quantity greater than zero.
 * 6. Assert default ordering is by created_at in descending chronological order.
 * 7. Ensure strict data isolation through use of customer-authenticated connection only.
 */
export async function test_api_cart_listing_with_computed_subtotals_and_availability(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  // 2. Request cart items with pagination parameters
  // Using explicit limit and page to verify pagination controls
  const body = {
    limit: 5,
    page: 1,
  } satisfies IEcommercePlatformShoppingCartItem.IRequest;
  const response =
    await api.functional.ecommercePlatform.customer.cart_items.index(
      customerConnection,
      { body },
    );
  typia.assert(response);
  // 3. Validate pagination metadata consistency
  TestValidator.equals(
    "pagination current page matches request",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    body.limit,
  );
  TestValidator.predicate(
    "pagination record count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.equals(
    "data array length matches expected",
    response.data.length,
    Math.min(response.pagination.records, body.limit),
  );
  // 4. For each cart item, validate computed fields
  // line_subtotal = quantity * COALESCE(variant.price, variant.product.basePrice)
  await ArrayUtil.asyncForEach(response.data, async (item) => {
    // Get effective price: variant.price or fallback to product.basePrice
    const effectivePrice = item.variant.price ?? item.variant.product.basePrice;
    const expectedSubtotal = item.quantity * effectivePrice;
    // Validate line subtotal calculation
    TestValidator.equals(
      `item ${item.id} line_subtotal computation`,
      item.line_subtotal,
      expectedSubtotal,
    );
    // Validate stock availability reflects inventory state
    const expectedAvailability = item.variant.stock_quantity > 0;
    TestValidator.equals(
      `item ${item.id} stock_availability reflects inventory`,
      item.stock_availability,
      expectedAvailability,
    );
  });
  // 5. Assert default ordering is created_at DESC
  // Verify that consecutive items have non-increasing created_at timestamps
  await ArrayUtil.asyncForEach(response.data, async (item, index) => {
    if (index > 0) {
      const previousItem = response.data[index - 1];
      TestValidator.predicate(
        `created_at ordering: item ${index - 1} >= item ${index}`,
        previousItem.created_at >= item.created_at,
      );
    }
  });
}
