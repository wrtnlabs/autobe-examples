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
 * Generate a random mall platform cancellation request via the API for E2E testing.
 *
 * Prepares cancellation request data using the prepare function, then creates the
 * request for the specified order item through the customer cancellation-request
 * endpoint.
 *
 * The generated request is tied to a specific order item identified by
 * `orderItemId`. The request body is produced by the prepare function so tests
 * always use valid creation payloads while still allowing deep-partial overrides.
 *
 * @param connection - API connection information used to call the backend.
 * @param props - Input payload overrides and the target order item identifier.
 * @returns The created mall platform cancellation request entity.
 */
export async function generate_random_mall_platform_customer_order_items_cancellation_requests_post_by_orderitemid(
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
  return await api.functional.mallPlatform.customer.orderItems.cancellationRequests.postByOrderitemid(
    connection,
    {
      body: prepared,
      orderItemId: props.params.orderItemId,
    },
  );
}
