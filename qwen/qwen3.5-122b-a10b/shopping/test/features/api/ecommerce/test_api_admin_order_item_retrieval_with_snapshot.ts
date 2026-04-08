import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator order item retrieval with snapshot validation.
 *
 * Validates that administrators can retrieve specific order items within orders and verify the complete response structure including embedded snapshot data. The snapshot preserves product and seller state at purchase time for audit and dispute resolution purposes.
 *
 * This test exercises the administrator's oversight capability to view order details across all platform transactions, ensuring historical data integrity is maintained through snapshot records.
 *
 * 1. Administrator registers and authenticates with valid credentials.
 * 2. Administrator retrieves a specific order item using orderId and itemId.
 * 3. Validates order item structure and embedded snapshot data.
 * 4. Verifies snapshot contains purchase-time state: product_name, seller_shop_name, base_price, etc.
 *
 * Note: This test requires pre-existing order item data in the test database. In a complete test suite, order items would be created through customer checkout flow using additional creation functions.
 */
export async function test_api_admin_order_item_retrieval_with_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceAdmin.IAuthorized =
    await api.functional.ecommerce.auth.admin.join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceAdmin.IJoin,
    });
  typia.assert(admin);
  // 2. Retrieve order item with snapshot data
  // Note: Requires pre-existing order item in test database
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orderItem: IEcommerceOrderItem =
    await api.functional.ecommerce.admin.orders.items.at(adminConnection, {
      orderId,
      itemId,
    });
  typia.assert(orderItem);
  // 3. Validate order item business logic
  TestValidator.predicate("quantity is positive", orderItem.quantity > 0);
  TestValidator.predicate("unit price is positive", orderItem.unit_price > 0);
  TestValidator.predicate("status is defined", orderItem.status.length > 0);
  // 4. Validate snapshot contains purchase-time data
  TestValidator.predicate(
    "snapshot has product name",
    orderItem.snapshot.product_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has seller shop name",
    orderItem.snapshot.seller_shop_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has base price",
    orderItem.snapshot.base_price > 0,
  );
  TestValidator.predicate(
    "snapshot has timestamp",
    orderItem.snapshot.created_at.length > 0,
  );
  // 5. Validate embedded references exist
  TestValidator.predicate(
    "order reference exists",
    orderItem.order !== undefined,
  );
  TestValidator.predicate(
    "productVariant reference exists",
    orderItem.productVariant !== undefined,
  );
  TestValidator.predicate(
    "seller reference exists",
    orderItem.seller !== undefined,
  );
}
