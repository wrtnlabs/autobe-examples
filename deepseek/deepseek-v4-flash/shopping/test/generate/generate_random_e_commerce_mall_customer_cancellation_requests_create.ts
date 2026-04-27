import api from "@ORGANIZATION/PROJECT-api";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_cancellation_request } from "../prepare/prepare_random_ecommerce_mall_cancellation_request";

/**
 * Generate a random cancellation request for an order item via the API for E2E testing.
 *
 * Prepares random cancellation request data using the prepare function, then calls the creation endpoint to submit it. The order item ID and cancellation reason can be overridden via the optional body input for specific test scenarios.
 *
 * @param connection The API connection configuration
 * @param props Optional input parameters for customizing the cancellation request data
 * @returns The created cancellation request with all system-assigned fields populated
 */
export async function generate_random_e_commerce_mall_customer_cancellation_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IECommerceMallCancellationRequest.ICreate> | undefined;
  }
): Promise<IECommerceMallCancellationRequest> {
  const prepared: IECommerceMallCancellationRequest.ICreate = prepare_random_ecommerce_mall_cancellation_request(
    props.body
  );
  return await api.functional.eCommerceMall.customer.cancellation_requests.create(
    connection,
    {
      body: prepared,
    },
  );
}