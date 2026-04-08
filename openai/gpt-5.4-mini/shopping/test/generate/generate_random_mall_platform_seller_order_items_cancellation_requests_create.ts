import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_cancellation_request } from "../prepare/prepare_random_mall_platform_cancellation_request";

/**
 * Generate a random mall platform cancellation request via the API for E2E testing.
 *
 * Prepares cancellation request data using the matching prepare function, then
 * submits it to the cancellation-request creation endpoint for the specified
 * order item.
 *
 * This helper is intended for end-to-end scenarios that need a real cancellation
 * request record linked to an existing paid order item. The order item identifier
 * must be provided through params.
 */
export async function generate_random_mall_platform_seller_order_items_cancellation_requests_create(
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
  const result: IMallPlatformCancellationRequest =
    await api.functional.mallPlatform.seller.orderItems.cancellationRequests.create(
      connection,
      {
        body: prepared,
        orderItemId: props.params.orderItemId,
      },
    );
  return result;
}
