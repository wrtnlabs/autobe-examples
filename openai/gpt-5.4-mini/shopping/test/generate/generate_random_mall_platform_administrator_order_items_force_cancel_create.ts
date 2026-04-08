import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { prepare_random_mall_platform_order_item } from "../prepare/prepare_random_mall_platform_order_item";

/**
 * Generate a random mall platform order item by force-canceling it through the administrator API.
 *
 * Prepares valid order-item creation data using the prepare function, then calls the administrator force-cancel endpoint with the required orderItemId path parameter. The created response is returned directly for E2E testing.
 */
export async function generate_random_mall_platform_administrator_order_items_force_cancel_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformOrderItem.ICreate> | undefined;
    params: {
      orderItemId: string;
    };
  },
): Promise<IMallPlatformOrderItem> {
  const prepared: IMallPlatformOrderItem.ICreate =
    prepare_random_mall_platform_order_item(props.body);
  return await api.functional.mallPlatform.administrator.orderItems.force_cancel.create(
    connection,
    {
      body: prepared,
      orderItemId: props.params.orderItemId,
    },
  );
}
