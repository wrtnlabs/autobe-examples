import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

export async function test_api_customer_cancellation_request_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerAuth);
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: "Order received damaged",
        },
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "request status is pending",
    cancellationRequest.requestStatus,
    "pending",
  );
  TestValidator.equals(
    "reason provided",
    cancellationRequest.reason,
    "Order received damaged",
  );
  const retrievedRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  TestValidator.equals(
    "retrieved ID matches",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "retrieved status is pending",
    retrievedRequest.requestStatus,
    "pending",
  );
  TestValidator.equals(
    "retrieved reason matches",
    retrievedRequest.reason,
    "Order received damaged",
  );
  TestValidator.notEquals(
    "customer summary exists",
    retrievedRequest.customer,
    null,
  );
  TestValidator.notEquals(
    "orderItem summary exists",
    retrievedRequest.orderItem,
    null,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedRequest.customer.email,
    customerAuth.email,
  );
  TestValidator.equals(
    "orderItem item_status is paid",
    retrievedRequest.orderItem.item_status,
    "paid",
  );
  TestValidator.predicate(
    "orderItem quantity positive",
    retrievedRequest.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "orderItem unit_price positive",
    retrievedRequest.orderItem.unit_price > 0,
  );
  TestValidator.notEquals(
    "product_snapshot exists",
    retrievedRequest.orderItem.product_snapshot,
    null,
  );
  TestValidator.notEquals(
    "variant_snapshot exists",
    retrievedRequest.orderItem.variant_snapshot,
    null,
  );
  TestValidator.notEquals(
    "seller_profile_snapshot exists",
    retrievedRequest.orderItem.seller_profile_snapshot,
    null,
  );
  TestValidator.notEquals(
    "createdAt timestamp exists",
    retrievedRequest.createdAt,
    null,
  );
  TestValidator.notEquals(
    "updatedAt timestamp exists",
    retrievedRequest.updatedAt,
    null,
  );
  TestValidator.equals(
    "deletedAt is null (not deleted)",
    retrievedRequest.deletedAt,
    null,
  );
}
