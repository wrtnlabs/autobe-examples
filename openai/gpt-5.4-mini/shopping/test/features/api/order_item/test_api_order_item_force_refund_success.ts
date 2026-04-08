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

export async function test_api_order_item_force_refund_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful administrator force-refund intervention for one order item.
   *
   * Verifies that an authenticated administrator can force-refund a targeted
   * order item and receive the updated order item response. The test validates
   * the administrative authentication flow and ensures the returned order item
   * is marked refunded after the intervention.
   *
   * This scenario is limited by the available test surface, which provides only
   * administrator authentication and the force-refund endpoint. The test keeps
   * connection isolation intact by using a dedicated administrator connection
   * created from the base connection.
   *
   * 1. Register and authenticate a fresh administrator account.
   * 2. Force-refund an eligible order item identifier.
   * 3. Validate the returned order item response.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234" as string & tags.Format<"password">,
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const orderItem =
    await api.functional.mallPlatform.administrator.orderItems.force_refund.forceRefund(
      administratorConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(orderItem);
  TestValidator.equals(
    "order item status should be refunded",
    orderItem.status,
    "refunded",
  );
  TestValidator.predicate(
    "order item should have an id",
    orderItem.id.length > 0,
  );
  TestValidator.predicate(
    "order item should retain its parent order",
    orderItem.order.id.length > 0,
  );
  TestValidator.predicate(
    "order item should retain its product variant",
    orderItem.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "order item should retain its seller",
    orderItem.seller.id.length > 0,
  );
}
