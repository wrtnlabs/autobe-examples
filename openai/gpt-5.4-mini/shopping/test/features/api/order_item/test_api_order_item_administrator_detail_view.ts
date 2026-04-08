import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_order_item_administrator_detail_view(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator order item detail retrieval for live operational records.
   *
   * Validates that an authenticated administrator can access a specific order
   * item detail view and receive the live order item payload with its relational
   * context. The response is checked for the parent order summary, purchased
   * product variant summary, seller summary, quantity, current status, and
   * lifecycle timestamps so the endpoint can be used for oversight and dispute
   * review.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Call the administrator order item detail endpoint with UUID parameters.
   * 3. Validate the response as a live IMallPlatformOrderItem payload.
   * 4. Confirm the nested summaries and live fields are populated.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  const orderItem =
    await api.functional.mallPlatform.administrator.orders.orderItems.at(
      adminConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(orderItem);
  TestValidator.predicate(
    "parent order summary exists",
    () =>
      orderItem.order.id.length > 0 && orderItem.order.orderNumber.length > 0,
  );
  TestValidator.predicate(
    "product variant summary exists",
    () =>
      orderItem.productVariant.id.length > 0 &&
      orderItem.productVariant.skuCode.length > 0,
  );
  TestValidator.predicate(
    "seller summary exists",
    () => orderItem.seller.id.length > 0 && orderItem.seller.email.length > 0,
  );
  TestValidator.predicate("quantity is positive", orderItem.quantity > 0);
  TestValidator.predicate("status is populated", orderItem.status.length > 0);
  TestValidator.predicate(
    "created timestamp is populated",
    orderItem.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp is populated",
    orderItem.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at remains nullable",
    orderItem.deleted_at,
    orderItem.deleted_at,
  );
}
