import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
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

import { prepare_random_mall_platform_cancellation_request } from "../prepare/prepare_random_mall_platform_cancellation_request";

/**
 * Generate a random cancellation request via the API for E2E testing.
 *
 * Prepares random cancellation request data using the prepare function, then
 * submits it to the cancellation request creation endpoint for the specified
 * order item. The created cancellation request entity is returned for use in
 * end-to-end test scenarios.
 *
 * The caller must provide the target order item identifier through params.
 * Optional body overrides are merged into the prepared payload before the API
 * call is made.
 */
export async function generate_random_mall_platform_administrator_order_items_cancellation_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformCancellationRequest.ICreate> | undefined;
    params: {
      orderItemId: string;
    };
  },
): Promise<IMallPlatformCancellationRequest> {
  const prepared: IMallPlatformCancellationRequest.ICreate =
    prepare_random_mall_platform_cancellation_request(props.body);
  return await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.create(
    connection,
    {
      body: prepared,
      orderItemId: props.params.orderItemId,
    },
  );
}
