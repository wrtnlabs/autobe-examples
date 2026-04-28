import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCancellationRequest";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_platform_cancellation_request } from "../prepare/prepare_random_ecommerce_platform_cancellation_request";

/**
 * Generate a random ecommerce platform customer cancellation request via the API for E2E testing.
 *
 * Prepares random cancellation request data using the prepare function with a UUID-formatted order item ID and a descriptive reason paragraph, then calls the creation endpoint to submit the request.
 *
 * The cancellation request targets an order item and enters a 'pending' status awaiting seller review. The system automatically associates the requesting customer from the authenticated session. Only order items in 'paid' status (not yet shipped) are eligible for cancellation.
 */
export async function generate_random_ecommerce_platform_customer_cancellation_requests_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IEcommercePlatformCancellationRequest.ICreate>
      | undefined;
  },
): Promise<IEcommercePlatformCancellationRequest> {
  const prepared: IEcommercePlatformCancellationRequest.ICreate =
    prepare_random_ecommerce_platform_cancellation_request(props.body);
  return await api.functional.ecommercePlatform.customer.cancellation_requests.create(
    connection,
    {
      body: prepared,
    },
  );
}
