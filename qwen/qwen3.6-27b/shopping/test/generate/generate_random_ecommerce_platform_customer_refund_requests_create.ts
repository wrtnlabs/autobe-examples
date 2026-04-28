import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_platform_refund_request } from "../prepare/prepare_random_ecommerce_platform_refund_request";

/**
 * Generate a random ecommerce platform customer refund request for E2E testing.
 *
 * Prepares random refund request data using the prepare function, then calls the
 * ecommercePlatform/customer/refund-requests endpoint to create a new refund
 * request for a delivered order item. The refund request is created with pending
 * status and includes the order item identifier and refund reason.
 *
 * @param connection - The API connection for making requests
 * @param props - Optional partial body data for customization
 * @returns The created refund request entity
 */
export async function generate_random_ecommerce_platform_customer_refund_requests_create(
  connection: api.IConnection,
  props?: {
    body?: DeepPartial<IEcommercePlatformRefundRequest.ICreate>;
  },
): Promise<IEcommercePlatformRefundRequest> {
  const prepared: IEcommercePlatformRefundRequest.ICreate =
    prepare_random_ecommerce_platform_refund_request(props?.body);
  const result: IEcommercePlatformRefundRequest =
    await api.functional.ecommercePlatform.customer.refund_requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
