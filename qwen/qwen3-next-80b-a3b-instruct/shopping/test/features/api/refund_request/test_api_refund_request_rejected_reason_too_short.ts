import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_refund_request_rejected_reason_too_short(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate customer via join using a generated email and password
  const customer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/referral",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  // Step 3: Create a new order (using the utility function)
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {
        body: {
          shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
          paymentMethodToken: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
  // Since order.orderItems is defined as string in the schema, we cannot extract item IDs from it.
  // Instead, we use a valid UUID for order_item_id, which is acceptable since the API should validate the
  // order_item_id existence separately and we're focusing on the reason field validation.
  // We use a UUID that's format-correct as per the schema (IShoppingMallRefundRequest.ICreate.order_item_id)
  // This test assumes the system will reject the request based on reason length regardless of order_item_id validity,
  // which is the business rule we need to validate.
  // Step 4: Prepare a refund request with a reason that is too short (5 characters)
  // Using 'short' which is exactly 5 characters, violating the 10-character minimum requirement
  const refundRequestData: IShoppingMallRefundRequest.ICreate = {
    order_item_id: typia.random<string & tags.Format<"uuid">>(), // Valid UUID format
    reason: "short", // This is only 5 characters - below the minimum 10 required
  } satisfies IShoppingMallRefundRequest.ICreate;
  // Step 5: Test that the system returns 400 Bad Request when reason is too short
  // This validates the business rule that refunds require at least 10 characters
  await TestValidator.httpError(
    "refund request should fail with 400 Bad Request when reason is too short (5 characters)",
    400, // Exact status code
    async () => {
      await api.functional.shoppingMall.customer.refund_requests.create(
        customerConnection,
        {
          body: refundRequestData,
        },
      );
    },
  );
}