import api from "@ORGANIZATION/PROJECT-api";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_refund_request } from "../prepare/prepare_random_ecommerce_mall_refund_request";

/**
 * Generate a random refund request for a delivered order item via the API for E2E testing.
 *
 * Prepares random refund request data using the prepare function, then calls the creation endpoint
 * to create a real refund request record in the backend. The refund request targets a specific
 * delivered order item and includes a randomly generated reason explaining why the refund is sought.
 *
 * Callers may override any property of the refund request by passing a partial input object under
 * 'props.body'. This allows tests to specify particular order items or reasons while letting the
 * prepare function fill in random defaults for unspecified properties.
 *
 * @param connection The API connection configuration including host and authentication headers
 * @param props.body Optional partial refund request creation data to override auto-generated values
 * @returns The created refund request record with full details including customer, seller, and order item references
 */
export async function generate_random_e_commerce_mall_customer_refund_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IECommerceMallRefundRequest.ICreate> | undefined;
  }
): Promise<IECommerceMallRefundRequest> {
  const prepared: IECommerceMallRefundRequest.ICreate = prepare_random_ecommerce_mall_refund_request(
    props.body
  );
  const result: IECommerceMallRefundRequest = await api.functional.eCommerceMall.customer.refund_requests.create(
    connection,
    {
      body: prepared,
    },
  );
  return result;
}