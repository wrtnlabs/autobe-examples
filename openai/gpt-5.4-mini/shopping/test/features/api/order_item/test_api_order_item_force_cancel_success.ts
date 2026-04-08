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
import { generate_random_mall_platform_administrator_order_items_force_cancel_create } from "../../../generate/generate_random_mall_platform_administrator_order_items_force_cancel_create";
import { prepare_random_mall_platform_order_item } from "../../../prepare/prepare_random_mall_platform_order_item";

export async function test_api_order_item_force_cancel_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validates administrator force-cancellation of a single eligible order item.
   *
   * This test confirms that an authenticated administrator can invoke the
   * force-cancel endpoint for one order item and receive a valid updated order
   * item response. It focuses on the successful administrative intervention
   * flow while keeping the request isolated to a dedicated administrator
   * connection.
   *
   * 1. Register and authenticate a dedicated administrator session.
   * 2. Call the order-item force-cancel endpoint for a UUID order item id.
   * 3. Validate the returned order item response shape.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: `P@ssw0rd${RandomGenerator.alphabets(6)}` satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const response =
    await generate_random_mall_platform_administrator_order_items_force_cancel_create(
      adminConnection,
      {
        params: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IMallPlatformOrderItem.ICreate,
      },
    );
  typia.assert(response);
}
