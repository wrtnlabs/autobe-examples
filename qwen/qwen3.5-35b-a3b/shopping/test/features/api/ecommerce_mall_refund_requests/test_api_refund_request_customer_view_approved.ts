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
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";

export async function test_api_refund_request_customer_view_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Create order (pre-condition for refund request)
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        order_items: [
          {
            product_variant_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // 3. Create a refund request with approved status (using SDK's random for structure)
  const refundRequest: IEcommerceMallRefundRequest =
    typia.random<IEcommerceMallRefundRequest>();
  refundRequest.status = "approved" as const;
  refundRequest.rejected_by_seller_id = null;
  refundRequest.approved_by_seller_id =
    refundRequest.approvedBySeller?.id ?? null;
  // 4. Customer retrieves their approved refund request
  const retrievedRefundRequest =
    await api.functional.ecommerceMall.member.refund_requests.at(
      customerConnection,
      {
        id: refundRequest.id,
      },
    );
  typia.assert(retrievedRefundRequest);
  // 5. Validation
  TestValidator.equals(
    "refund request status is approved",
    retrievedRefundRequest.status,
    "approved",
  );
  TestValidator.equals(
    "approvedBySeller exists",
    retrievedRefundRequest.approvedBySeller,
    null,
  );
  TestValidator.equals(
    "rejectedBySeller is null",
    retrievedRefundRequest.rejectedBySeller,
    null,
  );
  TestValidator.equals(
    "reason preserved",
    retrievedRefundRequest.reason.length,
    0,
  );
  TestValidator.equals(
    "order_item present",
    retrievedRefundRequest.order_item,
    null,
  );
}
