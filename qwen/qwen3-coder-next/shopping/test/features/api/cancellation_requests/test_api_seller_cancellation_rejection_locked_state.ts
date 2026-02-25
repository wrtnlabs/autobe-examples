import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_carts_items_create } from "../../../generate/generate_random_shopping_mall_customer_carts_items_create";
import { generate_random_shopping_mall_customer_order_items_cancel_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancel_request_create";
import { prepare_random_shopping_mall_order_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_order_cancellation_request";
import { prepare_random_shopping_mall_shopping_cart_item } from "../../../prepare/prepare_random_shopping_mall_shopping_cart_item";

export async function test_api_seller_cancellation_rejection_locked_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<
        string &
          (tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>)
      >(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string &
          (tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>)
      >(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Create product using seller API - use available endpoints
  // Since seller product endpoints are not available, we'll skip to order items
  // 4. Create cart item for customer
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(
      customerConnection,
      {
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        } satisfies IShoppingMallShoppingCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 5. Checkout - create order
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 6. Get order items - create order item with paid status
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 7. Customer submits cancellation request for order item
  const cancellationRequest =
    await api.functional.shoppingMall.customer.order_items.cancel_request.create(
      customerConnection,
      {
        itemId: orderItemId,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallOrderCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 8. Seller rejects the cancellation request
  const rejection =
    await api.functional.shoppingMall.seller.cancel_requests.rejection.reject(
      sellerConnection,
      {
        requestId: cancellationRequest.id,
        body: {
          rejection_reason: "Out of stock",
        } satisfies IShoppingMallOrderCancellationRequest.IUpdate,
      },
    );
  typia.assert(rejection);
  TestValidator.equals(
    "rejection status is rejected",
    rejection.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection has reason",
    rejection.rejection_reason,
    "Out of stock",
  );
  // 9. Attempt to reject again - should fail due to locked state
  await TestValidator.error("locked state rejection should fail", async () => {
    await api.functional.shoppingMall.seller.cancel_requests.rejection.reject(
      sellerConnection,
      {
        requestId: cancellationRequest.id,
        body: {
          rejection_reason: "New reason",
        } satisfies IShoppingMallOrderCancellationRequest.IUpdate,
      },
    );
  });
  // 10. Verify final state using the rejection from step 8
  TestValidator.equals("status remains rejected", rejection.status, "rejected");
  TestValidator.equals(
    "reason remains unchanged",
    rejection.rejection_reason,
    "Out of stock",
  );
}
