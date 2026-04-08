import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_member_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_member_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

export async function test_api_customer_cancellation_request_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://google.com",
    },
  });
  typia.assert(joinResult);
  // 2. Create cancellation request with random order item ID
  const cancellationRequest =
    await generate_random_ecommerce_mall_member_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // 3. View the cancellation request
  const retrieved =
    await api.functional.ecommerceMall.member.customer.cancel_requests.at(
      customerConnection,
      {
        requestId: cancellationRequest.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate core cancellation request fields
  TestValidator.equals(
    "request ID matches",
    retrieved.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "order item ID matches",
    retrieved.ecommerce_mall_order_item_id,
    cancellationRequest.ecommerce_mall_order_item_id,
  );
  TestValidator.equals(
    "order ID matches",
    retrieved.ecommerce_mall_order_id,
    cancellationRequest.ecommerce_mall_order_id,
  );
  TestValidator.equals(
    "seller ID matches",
    retrieved.ecommerce_mall_seller_id,
    cancellationRequest.ecommerce_mall_seller_id,
  );
  TestValidator.equals(
    "reason matches",
    retrieved.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals("status is pending", retrieved.status, "pending");
  // 5. Validate timestamps
  TestValidator.predicate(
    "created_at is valid",
    retrieved.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid",
    retrieved.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
  // 6. Validate related order item entity
  TestValidator.equals(
    "order item ID present",
    retrieved.item.id,
    cancellationRequest.item.id,
  );
  TestValidator.equals(
    "order number present",
    retrieved.item.order_number,
    cancellationRequest.item.order_number,
  );
  TestValidator.equals(
    "seller display name present",
    retrieved.item.seller_display_name,
    cancellationRequest.item.seller_display_name,
  );
  TestValidator.equals(
    "product variant name present",
    retrieved.item.product_variant_name,
    cancellationRequest.item.product_variant_name,
  );
  TestValidator.equals(
    "product variant SKU present",
    retrieved.item.product_variant_sku_code,
    cancellationRequest.item.product_variant_sku_code,
  );
  TestValidator.equals("item status is paid", retrieved.item.status, "paid");
  TestValidator.equals(
    "quantity matches",
    retrieved.item.quantity,
    cancellationRequest.item.quantity,
  );
  TestValidator.equals(
    "unit price matches",
    retrieved.item.unit_price,
    cancellationRequest.item.unit_price,
  );
  TestValidator.equals(
    "subtotal matches",
    retrieved.item.subtotal,
    cancellationRequest.item.subtotal,
  );
  TestValidator.equals(
    "item created_at matches",
    retrieved.item.created_at,
    cancellationRequest.item.created_at,
  );
  // 7. Validate related order entity
  TestValidator.equals(
    "order ID present",
    retrieved.order.id,
    cancellationRequest.order.id,
  );
  TestValidator.equals(
    "order number present",
    retrieved.order.order_number,
    cancellationRequest.order.order_number,
  );
  TestValidator.equals(
    "order status present",
    retrieved.order.status,
    cancellationRequest.order.status,
  );
  TestValidator.equals(
    "total price matches",
    retrieved.order.total_price,
    cancellationRequest.order.total_price,
  );
  TestValidator.equals(
    "customer ID matches",
    retrieved.order.customer.id,
    cancellationRequest.order.customer.id,
  );
  TestValidator.equals(
    "customer display name matches",
    retrieved.order.customer.display_name,
    cancellationRequest.order.customer.display_name,
  );
  TestValidator.equals(
    "shipping address ID present",
    retrieved.order.shipping_address.id,
    cancellationRequest.order.shipping_address.id,
  );
  TestValidator.equals(
    "shipping recipient name present",
    retrieved.order.shipping_address.recipient_name,
    cancellationRequest.order.shipping_address.recipient_name,
  );
  // 8. Validate related seller entity
  TestValidator.equals(
    "seller ID present",
    retrieved.seller.id,
    cancellationRequest.seller.id,
  );
  TestValidator.equals(
    "seller display name matches",
    retrieved.seller.display_name,
    cancellationRequest.seller.display_name,
  );
  TestValidator.equals(
    "seller approval status present",
    retrieved.seller.approval_status,
    cancellationRequest.seller.approval_status,
  );
  TestValidator.equals(
    "seller is_suspended matches",
    retrieved.seller.is_suspended,
    cancellationRequest.seller.is_suspended,
  );
  TestValidator.equals(
    "seller created_at matches",
    retrieved.seller.created_at,
    cancellationRequest.seller.created_at,
  );
  // 9. Validate cancellation request entity completeness
  typia.assert(retrieved);
}
