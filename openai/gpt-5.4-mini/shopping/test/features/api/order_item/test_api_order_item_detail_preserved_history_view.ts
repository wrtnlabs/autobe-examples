import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Verifies preserved historical detail for a seller order item detail view.
 *
 * This test exercises the seller order-item detail endpoint and validates that the returned live order-item record can be read successfully. It focuses on the preserved relations and lifecycle fields that remain available to sellers for fulfillment review and dispute handling, while avoiding assumptions about unlisted snapshot fields.
 *
 * 1. A fresh seller account is created through the seller join utility and authenticated.
 * 2. The seller order-item detail endpoint is called with a UUID identifier.
 * 3. The returned order-item payload is validated for structural integrity and the presence of the live relation fields defined in the DTOs.
 */
export async function test_api_order_item_detail_preserved_history_view(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(authorized);
  const orderItem = await api.functional.mallPlatform.seller.orderItems.at(
    sellerConnection,
    {
      orderItemId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(orderItem);
  TestValidator.predicate(
    "order item status exists",
    orderItem.status.length > 0,
  );
  TestValidator.predicate(
    "order relation exists",
    orderItem.order.id.length > 0,
  );
  TestValidator.predicate(
    "variant relation exists",
    orderItem.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "seller relation exists",
    orderItem.seller.id.length > 0,
  );
  TestValidator.predicate(
    "quantity is preserved in the live item record",
    orderItem.quantity > 0,
  );
}
