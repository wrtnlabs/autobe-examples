import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_list_for_administrator_order_overview(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify the administrator order-item overview endpoint returns a stable
   * paginated list of item summaries scoped to a specific order.
   *
   * This test authenticates an administrator, requests the order-item overview
   * endpoint for a UUID-scoped order identifier, and validates that the
   * response is a paginated collection of order item summaries. It checks the
   * pagination metadata and ensures every returned item carries the expected
   * order reference, product variant summary, seller summary, quantity, status,
   * timestamps, and nullable deletion marker required for oversight screens.
   *
   * The test intentionally focuses on the response contract of the
   * administrator-facing item list, including nested summaries and nullable
   * fields, so the endpoint remains suitable for order-detail browsing and
   * administrative review flows.
   *
   * 1. Authenticate an administrator using an isolated actor connection.
   * 2. Query the administrator order-item list for a scoped order identifier.
   * 3. Validate pagination metadata and every returned order-item summary.
   * 4. Confirm the response contains only the requested order's items.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const page =
    await api.functional.mallPlatform.administrator.orders.orderItems.index(
      administratorConnection,
      {
        orderId,
        body: {
          mallPlatformOrderId: orderId,
          page: 1,
          limit: 100,
          sort: "+created_at",
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit is positive",
    page.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination record count is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "all returned items belong to the requested order",
    page.data.every((item) => item.order.id === orderId),
  );
  for (const item of page.data) {
    TestValidator.equals(
      "item belongs to requested order",
      item.order.id,
      orderId,
    );
    TestValidator.predicate("item quantity is positive", item.quantity > 0);
    TestValidator.predicate("item status exists", item.status.length > 0);
    TestValidator.predicate(
      "item created timestamp exists",
      item.created_at.length > 0,
    );
    TestValidator.predicate(
      "item updated timestamp exists",
      item.updated_at.length > 0,
    );
    TestValidator.equals(
      "active item deletedAt remains nullable",
      item.deleted_at,
      null,
    );
    TestValidator.predicate(
      "variant summary exists",
      item.productVariant.id.length > 0 &&
        item.productVariant.product.id.length > 0,
    );
    TestValidator.predicate(
      "seller summary exists",
      item.seller.id.length > 0 && item.seller.email.length > 0,
    );
  }
}
