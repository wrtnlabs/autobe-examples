import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

/**
 * Test successful refund request creation by a customer.
 *
 * Prerequisites: Customer authentication
 * Steps:
 * 1) Authenticate as customer using authorize_customer_join
 * 2) Create refund request using utility function (handles prerequisite operations like creating delivered order)
 * 3) Validate response has ID, status set to 'pending', linked order item, reason, and timestamps
 */
export async function test_api_refund_request_customer_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for customer
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as customer
  await authorize_customer_join(customerConnection, {});
  // 2. Create refund request (utility handles prerequisite operations including creating delivered order item)
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          reason: "Product was damaged during shipping and is unusable",
        },
      },
    );
  // 3. Validate response structure and types
  typia.assert(refundRequest);
  // 4. Business logic validation per scenario requirements
  TestValidator.equals("status is pending", refundRequest.status, "pending");
  TestValidator.predicate("has valid id", refundRequest.id !== undefined);
  TestValidator.predicate(
    "has order item",
    refundRequest.orderItem !== undefined,
  );
  TestValidator.predicate(
    "has customer info",
    refundRequest.customer !== undefined,
  );
  TestValidator.predicate(
    "has seller info",
    refundRequest.seller !== undefined,
  );
  TestValidator.predicate(
    "has created timestamp",
    refundRequest.createdAt !== undefined,
  );
  TestValidator.predicate(
    "has requested timestamp",
    refundRequest.requestedAt !== undefined,
  );
}
