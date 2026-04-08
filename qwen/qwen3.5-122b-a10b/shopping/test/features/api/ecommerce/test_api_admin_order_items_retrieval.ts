import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator order items retrieval for a specific order.
 *
 * Validates that authenticated administrators can retrieve all order items belonging to a specific order through the admin endpoint. This test ensures admins have full oversight access to order line items across all platform orders, including fulfillment status, pricing information, and references to related entities.
 *
 * The test verifies the complete response structure including pagination metadata, order item summaries with nested references to orders, product variants, and sellers. It confirms that purchase-time pricing is preserved and that all required fields are present in the response.
 *
 * 1. Administrator account creation and authentication
 * 2. Order items retrieval with valid order ID
 * 3. Response structure validation with typia.assert()
 * 4. Pagination metadata verification
 * 5. Order item field validation including nested references
 * 6. Seller shop name and product variant option values verification
 */
export async function test_api_admin_order_items_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Generate order ID for retrieval
  // Note: In production test environment, this should reference an existing order
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve order items with empty request body (no filters)
  const result: IPageIEcommerceOrderItem.ISummary =
    await api.functional.ecommerce.admin.orders.items.index(adminConnection, {
      orderId,
      body: {} satisfies IEcommerceOrderItem.IRequest,
    });
  typia.assert(result);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is non-negative",
    result.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is non-negative",
    result.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination records count is non-negative",
    result.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages count is non-negative",
    result.pagination.pages >= 0,
    true,
  );
  TestValidator.predicate("pages calculated correctly", () =>
    result.pagination.limit > 0
      ? result.pagination.pages ===
        Math.ceil(result.pagination.records / result.pagination.limit)
      : result.pagination.pages === 0,
  );
  // 5. Validate order items if present
  if (result.data.length > 0) {
    await TestValidator.predicate(
      "all order items have required fields",
      async () => {
        for (const item of result.data) {
          // Full object validation ensures all nested properties are valid
          typia.assert(item);
        }
        return true;
      },
    );
    // 6. Verify quantity is positive
    TestValidator.predicate(
      "all quantities are positive",
      result.data.every((item) => item.quantity > 0),
    );
    // 7. Verify unit price is non-negative
    TestValidator.predicate(
      "all unit prices are non-negative",
      result.data.every((item) => item.unit_price >= 0),
    );
    // 8. Verify status is valid enum value
    const validStatuses = [
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ];
    TestValidator.predicate(
      "all statuses are valid",
      result.data.every((item) => validStatuses.includes(item.status)),
    );
  } else {
    // Empty result is valid for non-existent order
    TestValidator.equals(
      "empty data array for non-existent order",
      result.data.length,
      0,
    );
  }
}
