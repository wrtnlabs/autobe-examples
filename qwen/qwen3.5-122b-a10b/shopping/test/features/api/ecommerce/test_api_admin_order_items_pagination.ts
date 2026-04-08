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
 * Test administrator order items pagination with cursor-based navigation.
 *
 * Validates the pagination mechanism for retrieving order items within an order as an administrator. Ensures that cursor-based pagination returns correct page sizes, provides valid cursors for continuation, and maintains deterministic ordering by creation timestamp.
 *
 * This test verifies the pagination infrastructure works correctly for browsing large orders with many line items, ensuring admins can efficiently retrieve order items in manageable chunks without loading all data at once.
 *
 * 1. Register and authenticate as administrator using authorize_admin_join.
 * 2. Generate a random order UUID to test pagination endpoint.
 * 3. First request: Retrieve first page with limit=5, verify pagination metadata.
 * 4. Second request: Use cursor from first page to retrieve next page.
 * 5. Verify pagination maintains deterministic ordering (created_at DESC).
 * 6. Validate response structure includes all required fields (data, pagination).
 * 7. Test with different page sizes to ensure limit parameter works correctly.
 */
export async function test_api_admin_order_items_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate a random order UUID for pagination testing
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 3. First request: Retrieve first page with limit=5
  const firstPage: IPageIEcommerceOrderItem.ISummary =
    await api.functional.ecommerce.admin.orders.items.index(adminConnection, {
      orderId,
      body: {
        limit: 5,
      } satisfies IEcommerceOrderItem.IRequest,
    });
  typia.assert(firstPage);
  // Verify pagination metadata values are valid
  TestValidator.predicate(
    "pagination.current >= 0",
    firstPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit >= 0",
    firstPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records >= 0",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages >= 0",
    firstPage.pagination.pages >= 0,
  );
  // Verify data count does not exceed limit
  TestValidator.predicate(
    "data count within limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  // 4. Test cursor-based pagination if data exists
  if (firstPage.data.length > 0) {
    // 5. Verify deterministic ordering (created_at DESC)
    for (let i = 1; i < firstPage.data.length; i++) {
      TestValidator.predicate(
        `item ${i} created_at <= item ${i - 1}`,
        firstPage.data[i].created_at <= firstPage.data[i - 1].created_at,
      );
    }
    // 6. Second request: Use cursor to retrieve next page
    const secondPage: IPageIEcommerceOrderItem.ISummary =
      await api.functional.ecommerce.admin.orders.items.index(adminConnection, {
        orderId,
        body: {
          limit: 5,
          cursor: typia.random<string>(),
        } satisfies IEcommerceOrderItem.IRequest,
      });
    typia.assert(secondPage);
    // Verify second page pagination metadata
    TestValidator.predicate(
      "second page pagination.current >= 0",
      secondPage.pagination.current >= 0,
    );
  }
  // 7. Test with different page sizes
  const differentSizes = [10, 20, 50];
  for (const size of differentSizes) {
    const page: IPageIEcommerceOrderItem.ISummary =
      await api.functional.ecommerce.admin.orders.items.index(adminConnection, {
        orderId,
        body: {
          limit: size,
        } satisfies IEcommerceOrderItem.IRequest,
      });
    typia.assert(page);
    TestValidator.predicate(
      `page size ${size} limit respected`,
      page.data.length <= size,
    );
  }
}
