import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderCancellationRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequestOfCustomer";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_customer_cancellation_request_customer_view_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register a customer (join) to obtain an authenticated context.
  const joinBody = typia.random<IShoppingMallCustomerAuth.IJoin>();

  const authorizedCustomer = await api.functional.auth.customer.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorizedCustomer);

  // 2. Create a customer cart for this authenticated customer.
  const cartCreateBody = typia.random<IShoppingMallCustomerCart.ICreate>();

  const cart = await api.functional.shoppingMall.customer.customerCarts.create(
    connection,
    {
      body: cartCreateBody,
    },
  );
  typia.assert<IShoppingMallCustomerCart>(cart);

  // 3. Add at least one item to the cart.
  const cartItemCreateBody =
    typia.random<IShoppingMallCustomerCartItem.ICreate>();

  const cartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCartItem>(cartItem);

  // 4. Create an order from the customer cart.
  const randomOrderCreate = typia.random<IShoppingMallOrder.ICreate>();
  const orderCreateBody = {
    ...randomOrderCreate,
    customer_cart_id: cart.id,
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: orderCreateBody,
    },
  );
  typia.assert<IShoppingMallOrder>(order);

  // 5. Create a cancellation request for that order.
  const cancelCreateBody =
    typia.random<IShoppingMallOrderCancellationRequest.ICreate>();

  const cancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: cancelCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderCancellationRequest>(cancellationRequest);

  const orderId = order.id;
  const cancellationRequestId = cancellationRequest.id;

  // 6. Confirm that the customer-specific view works when authenticated
  //    (happy path check so that IDs are valid).
  const customerView =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.customer.at(
      connection,
      {
        orderId,
        cancellationRequestId,
      },
    );
  typia.assert<IShoppingMallOrderCancellationRequestOfCustomer>(customerView);

  // 7. Build an unauthenticated connection by cloning and clearing headers,
  //    then never manipulating headers again.
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 8. Verify that unauthenticated access to the customer-specific view fails.
  await TestValidator.error(
    "unauthenticated customer cancellation view should fail",
    async () => {
      await api.functional.shoppingMall.customer.orders.cancellationRequests.customer.at(
        anonymousConnection,
        {
          orderId,
          cancellationRequestId,
        },
      );
    },
  );
}
