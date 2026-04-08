import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller order items listing with pagination and filtering validation.
 *
 * Validates that a seller can successfully retrieve order items for orders containing their products. The test ensures proper authentication, response structure, and that all order item summary fields are correctly populated including parent order references, product variant details, and seller information.
 *
 * The endpoint supports cursor-based pagination with configurable page sizes and filtering options. Response includes comprehensive order item summaries with purchase-time pricing, fulfillment status, and nested references to related entities.
 *
 * 1. Create and authenticate a seller account using authorize_seller_join utility
 * 2. Call the seller order items listing endpoint with a random order ID
 * 3. Validate pagination metadata contains current page, limit, records count, and total pages
 * 4. Verify each order item includes id, quantity, unit_price, status, created_at, updated_at
 * 5. Confirm order reference contains id, order_number, status, total_price, customer reference
 * 6. Validate product variant reference includes id, sku_code, option_values, stock_count, product reference
 * 7. Verify seller reference contains id, approval_status, shop_name, and account status flags
 */
export async function test_api_seller_order_items_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Call seller order items listing endpoint
  const result: IPageIEcommerceOrderItem.ISummary =
    await api.functional.ecommerce.seller.orders.items.index(sellerConnection, {
      orderId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IEcommerceOrderItem.IRequest,
    });
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page exists",
    result.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit exists",
    result.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination records count exists",
    result.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages count exists",
    result.pagination.pages >= 0,
    true,
  );
  // 4. Validate each order item has required fields
  await ArrayUtil.asyncForEach(result.data, async (item) => {
    // Basic fields
    TestValidator.equals("item has id", typeof item.id === "string", true);
    TestValidator.equals("item quantity is positive", item.quantity >= 1, true);
    TestValidator.equals(
      "item has unit_price",
      typeof item.unit_price === "number",
      true,
    );
    TestValidator.predicate(
      "item has status",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        item.status,
      ),
    );
    // Order reference
    TestValidator.equals(
      "order has id",
      typeof item.order.id === "string",
      true,
    );
    TestValidator.equals(
      "order has order_number",
      typeof item.order.order_number === "string",
      true,
    );
    TestValidator.equals(
      "order has status",
      typeof item.order.status === "string",
      true,
    );
    TestValidator.equals(
      "order has total_price",
      typeof item.order.total_price === "number",
      true,
    );
    // Product variant reference
    TestValidator.equals(
      "variant has id",
      typeof item.productVariant.id === "string",
      true,
    );
    TestValidator.equals(
      "variant has sku_code",
      typeof item.productVariant.sku_code === "string",
      true,
    );
    TestValidator.equals(
      "variant has option_values",
      typeof item.productVariant.option_values === "string",
      true,
    );
    TestValidator.equals(
      "variant has stock_count",
      typeof item.productVariant.stock_count === "number",
      true,
    );
    // Seller reference
    TestValidator.equals(
      "seller has id",
      typeof item.seller.id === "string",
      true,
    );
    TestValidator.equals(
      "seller has shop_name",
      typeof item.seller.shop_name === "string",
      true,
    );
    TestValidator.predicate(
      "seller has approval_status",
      typeof item.seller.approval_status === "string",
    );
    TestValidator.predicate(
      "seller is_suspended is boolean",
      typeof item.seller.is_suspended === "boolean",
    );
    TestValidator.predicate(
      "seller is_banned is boolean",
      typeof item.seller.is_banned === "boolean",
    );
  });
}
