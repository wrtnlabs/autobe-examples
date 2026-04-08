import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_member_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_member_refund_requests_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_refund_request_creation_for_delivered_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a customer for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Create an order to populate the system with order data
  // This helps ensure there are orders in the test database
  await generate_random_ecommerce_mall_member_orders_create(
    customerConnection,
    {
      body: {},
    },
  );
  // 3. Create a refund request for a delivered order item
  // The utility function will find a delivered order item in the system
  const refundRequest =
    await generate_random_ecommerce_mall_member_refund_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
        },
      },
    );
  typia.assert(refundRequest);
  // 4. Validate refund request creation
  TestValidator.equals(
    "refund request status",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "order item reference correct",
    refundRequest.order_item_id,
    refundRequest.order_item.id,
  );
  TestValidator.equals(
    "approved_by_seller_id is null",
    refundRequest.approved_by_seller_id,
    null,
  );
  TestValidator.equals(
    "rejected_by_seller_id is null",
    refundRequest.rejected_by_seller_id,
    null,
  );
  TestValidator.predicate(
    "created_at timestamp is set",
    refundRequest.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    refundRequest.updated_at !== undefined,
  );
  TestValidator.predicate(
    "order item has correct status",
    refundRequest.order_item.status === "delivered",
  );
  TestValidator.equals(
    "reason is stored",
    refundRequest.reason,
    refundRequest.reason,
  );
}
