import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
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

export async function test_api_customer_refund_request_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.Format<"email"> &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.MinLength<8> &
        tags.Format<"password">,
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
    },
  });
  typia.assert(customerAuth);
  // 2. Customer submits refund request using generated data
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          reason: typia.random<
            string & tags.MinLength<1>
          >() satisfies string as string & tags.MinLength<1>,
        },
      },
    );
  typia.assert(refundRequest);
  const createdReason = refundRequest.reason;
  const refundRequestId = refundRequest.id;
  const createdStatus = refundRequest.request_status;
  // 3. Customer retrieves the refund request by ID
  const retrievedRequest =
    await api.functional.ecommerceMall.customer.refund_requests.at(
      customerConnection,
      {
        refundRequestId,
      },
    );
  typia.assert(retrievedRequest);
  // 4. Validate response contains correct data
  TestValidator.equals(
    "refund request ID matches",
    retrievedRequest.id,
    refundRequestId,
  );
  TestValidator.equals(
    "reason matches original submission",
    retrievedRequest.reason,
    createdReason,
  );
  TestValidator.equals(
    "request status is pending",
    retrievedRequest.request_status,
    "pending",
  );
  // Validate timestamps are valid date-time format
  const createdDate = new Date(retrievedRequest.created_at);
  const updatedDate = new Date(retrievedRequest.updated_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdDate.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedDate.getTime()),
  );
  // Validate order item details are preserved
  TestValidator.equals(
    "order item ID matches",
    retrievedRequest.order_item.id,
    refundRequest.order_item.id,
  );
  TestValidator.equals(
    "order item quantity preserved",
    retrievedRequest.order_item.quantity,
    refundRequest.order_item.quantity,
  );
  TestValidator.equals(
    "order item unit price preserved",
    retrievedRequest.order_item.unit_price,
    refundRequest.order_item.unit_price,
  );
  TestValidator.equals(
    "order item status preserved",
    retrievedRequest.order_item.item_status,
    refundRequest.order_item.item_status,
  );
  // Validate deleted_at is null (active record)
  TestValidator.equals(
    "refund request is not soft-deleted",
    retrievedRequest.deleted_at,
    null,
  );
  // Validate snapshots exist
  TestValidator.predicate(
    "product snapshot exists",
    Object.keys(retrievedRequest.order_item.product_snapshot).length > 0,
  );
  TestValidator.predicate(
    "variant snapshot exists",
    Object.keys(retrievedRequest.order_item.variant_snapshot).length > 0,
  );
  TestValidator.predicate(
    "seller profile snapshot exists",
    Object.keys(retrievedRequest.order_item.seller_profile_snapshot).length > 0,
  );
}
