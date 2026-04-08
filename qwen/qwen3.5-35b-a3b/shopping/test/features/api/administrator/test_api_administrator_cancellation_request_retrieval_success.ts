import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_cancellation_request_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register administrator account to gain administrative access
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(3),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminResult);
  // Step 2: Generate mock cancellation request data for testing
  const mockCancellationRequest =
    typia.random<IEcommerceMallCancellationRequest>();
  // Step 3: Administrator retrieves the cancellation request by UUID
  const retrievedRequest =
    await api.functional.ecommerceMall.administrator.cancellation_requests.at(
      adminConnection,
      {
        id: mockCancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // Step 4: Validate response structure matches mock data
  TestValidator.equals(
    "cancellation request id matches",
    retrievedRequest.id,
    mockCancellationRequest.id,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedRequest.created_at,
    mockCancellationRequest.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedRequest.updated_at,
    mockCancellationRequest.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null (active record)",
    retrievedRequest.deleted_at,
    null,
  );
  TestValidator.equals(
    "ecommerce_mall_order_id matches",
    retrievedRequest.ecommerce_mall_order_id,
    mockCancellationRequest.ecommerce_mall_order_id,
  );
  TestValidator.equals(
    "ecommerce_mall_order_item_id matches",
    retrievedRequest.ecommerce_mall_order_item_id,
    mockCancellationRequest.ecommerce_mall_order_item_id,
  );
  TestValidator.equals(
    "ecommerce_mall_seller_id matches",
    retrievedRequest.ecommerce_mall_seller_id,
    mockCancellationRequest.ecommerce_mall_seller_id,
  );
  TestValidator.equals(
    "reason matches customer input",
    retrievedRequest.reason,
    mockCancellationRequest.reason,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  // Step 5: Validate item summary structure
  typia.assert(retrievedRequest.item);
  TestValidator.equals(
    "item id matches",
    retrievedRequest.item.id,
    mockCancellationRequest.item.id,
  );
  TestValidator.equals(
    "item order number matches",
    retrievedRequest.item.order_number,
    mockCancellationRequest.item.order_number,
  );
  TestValidator.equals(
    "item seller_display_name matches",
    retrievedRequest.item.seller_display_name,
    mockCancellationRequest.item.seller_display_name,
  );
  TestValidator.equals(
    "item product_variant_name matches",
    retrievedRequest.item.product_variant_name,
    mockCancellationRequest.item.product_variant_name,
  );
  TestValidator.equals(
    "item product_variant_sku_code matches",
    retrievedRequest.item.product_variant_sku_code,
    mockCancellationRequest.item.product_variant_sku_code,
  );
  TestValidator.equals(
    "item product_variant_price matches",
    retrievedRequest.item.product_variant_price,
    mockCancellationRequest.item.product_variant_price,
  );
  TestValidator.equals(
    "item quantity matches",
    retrievedRequest.item.quantity,
    mockCancellationRequest.item.quantity,
  );
  TestValidator.equals(
    "item unit_price matches",
    retrievedRequest.item.unit_price,
    mockCancellationRequest.item.unit_price,
  );
  TestValidator.equals(
    "item subtotal matches",
    retrievedRequest.item.subtotal,
    mockCancellationRequest.item.subtotal,
  );
  TestValidator.equals(
    "item status is paid",
    retrievedRequest.item.status,
    "paid",
  );
  TestValidator.equals(
    "item created_at matches",
    retrievedRequest.item.created_at,
    mockCancellationRequest.item.created_at,
  );
  // Step 6: Validate order summary structure
  typia.assert(retrievedRequest.order);
  TestValidator.equals(
    "order id matches",
    retrievedRequest.order.id,
    mockCancellationRequest.order.id,
  );
  TestValidator.equals(
    "order order_number matches",
    retrievedRequest.order.order_number,
    mockCancellationRequest.order.order_number,
  );
  TestValidator.equals(
    "order status matches",
    retrievedRequest.order.status,
    mockCancellationRequest.order.status,
  );
  TestValidator.equals(
    "order total_price matches",
    retrievedRequest.order.total_price,
    mockCancellationRequest.order.total_price,
  );
  TestValidator.equals(
    "order created_at matches",
    retrievedRequest.order.created_at,
    mockCancellationRequest.order.created_at,
  );
  TestValidator.equals(
    "order items_count matches",
    retrievedRequest.order.items_count,
    mockCancellationRequest.order.items_count,
  );
  TestValidator.notEquals(
    "order deleted_at is null (active)",
    retrievedRequest.order.deleted_at,
    null,
  );
  // Step 7: Validate customer reference in order
  typia.assert(retrievedRequest.order.customer);
  TestValidator.equals(
    "customer id matches",
    retrievedRequest.order.customer.id,
    mockCancellationRequest.order.customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedRequest.order.customer.email,
    mockCancellationRequest.order.customer.email,
  );
  TestValidator.equals(
    "customer created_at matches",
    retrievedRequest.order.customer.created_at,
    mockCancellationRequest.order.customer.created_at,
  );
  TestValidator.equals(
    "customer updated_at matches",
    retrievedRequest.order.customer.updated_at,
    mockCancellationRequest.order.customer.updated_at,
  );
  TestValidator.notEquals(
    "customer deleted_at is null (active)",
    retrievedRequest.order.customer.deleted_at,
    null,
  );
  // Step 8: Validate shipping address in order
  typia.assert(retrievedRequest.order.shipping_address);
  TestValidator.equals(
    "shipping address id matches",
    retrievedRequest.order.shipping_address.id,
    mockCancellationRequest.order.shipping_address.id,
  );
  TestValidator.equals(
    "shipping address recipient_name matches",
    retrievedRequest.order.shipping_address.recipient_name,
    mockCancellationRequest.order.shipping_address.recipient_name,
  );
  TestValidator.equals(
    "shipping address phone matches",
    retrievedRequest.order.shipping_address.phone,
    mockCancellationRequest.order.shipping_address.phone,
  );
  TestValidator.equals(
    "shipping address street matches",
    retrievedRequest.order.shipping_address.street,
    mockCancellationRequest.order.shipping_address.street,
  );
  TestValidator.equals(
    "shipping address city matches",
    retrievedRequest.order.shipping_address.city,
    mockCancellationRequest.order.shipping_address.city,
  );
  TestValidator.equals(
    "shipping address state matches",
    retrievedRequest.order.shipping_address.state,
    mockCancellationRequest.order.shipping_address.state,
  );
  TestValidator.equals(
    "shipping address postal_code matches",
    retrievedRequest.order.shipping_address.postal_code,
    mockCancellationRequest.order.shipping_address.postal_code,
  );
  TestValidator.equals(
    "shipping address country matches",
    retrievedRequest.order.shipping_address.country,
    mockCancellationRequest.order.shipping_address.country,
  );
  TestValidator.equals(
    "shipping address is_default matches",
    retrievedRequest.order.shipping_address.is_default,
    mockCancellationRequest.order.shipping_address.is_default,
  );
  TestValidator.equals(
    "shipping address created_at matches",
    retrievedRequest.order.shipping_address.created_at,
    mockCancellationRequest.order.shipping_address.created_at,
  );
  TestValidator.equals(
    "shipping address updated_at matches",
    retrievedRequest.order.shipping_address.updated_at,
    mockCancellationRequest.order.shipping_address.updated_at,
  );
  // Step 9: Validate seller summary structure
  typia.assert(retrievedRequest.seller);
  TestValidator.equals(
    "seller id matches",
    retrievedRequest.seller.id,
    mockCancellationRequest.seller.id,
  );
  TestValidator.equals(
    "seller display_name matches",
    retrievedRequest.seller.display_name,
    mockCancellationRequest.seller.display_name,
  );
  TestValidator.equals(
    "seller approval_status matches",
    retrievedRequest.seller.approval_status,
    mockCancellationRequest.seller.approval_status,
  );
  TestValidator.equals(
    "seller is_suspended matches",
    retrievedRequest.seller.is_suspended,
    mockCancellationRequest.seller.is_suspended,
  );
  TestValidator.equals(
    "seller created_at matches",
    retrievedRequest.seller.created_at,
    mockCancellationRequest.seller.created_at,
  );
  TestValidator.equals(
    "seller updated_at matches",
    retrievedRequest.seller.updated_at,
    mockCancellationRequest.seller.updated_at,
  );
  TestValidator.notEquals(
    "seller deleted_at is null (active)",
    retrievedRequest.seller.deleted_at,
    null,
  );
  // Step 10: Validate timestamps are valid ISO 8601 datetime
  TestValidator.predicate(
    "cancellation request created_at is valid datetime",
    () => !isNaN(Date.parse(retrievedRequest.created_at)),
  );
  TestValidator.predicate(
    "cancellation request updated_at is valid datetime",
    () => !isNaN(Date.parse(retrievedRequest.updated_at)),
  );
  TestValidator.predicate(
    "order item created_at is valid datetime",
    () => !isNaN(Date.parse(retrievedRequest.item.created_at)),
  );
  TestValidator.predicate(
    "order created_at is valid datetime",
    () => !isNaN(Date.parse(retrievedRequest.order.created_at)),
  );
  TestValidator.predicate(
    "seller created_at is valid datetime",
    () => !isNaN(Date.parse(retrievedRequest.seller.created_at)),
  );
  // Step 11: Validate business rules - administrator can view any cancellation request
  TestValidator.equals(
    "administrator successfully retrieved cancellation request",
    retrievedRequest.status,
    "pending",
  );
}
