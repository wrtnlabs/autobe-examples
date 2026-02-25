import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemOption";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cart_create } from "../../../generate/generate_random_shopping_mall_customer_cart_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";

export async function test_api_order_cancel_request_duplicate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData: IShoppingMallCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(authorized);
  // 2. Create cart item to establish paid order context
  // Generate random variant ID from available products
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const cartItemData: IShoppingMallCart.ICreate = {
    variant_id: variantId,
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
    >(),
  } satisfies IShoppingMallCart.ICreate;
  // Use utility function for cart creation as specified in requirements
  const cartItem = await generate_random_shopping_mall_customer_cart_create(
    customerConnection,
    { body: cartItemData },
  );
  // Fix: Assert correct type that includes 'id' property based on runtime structure
  const cartItemWithId = typia.assert<IShoppingMallCartItem & { id: string }>(cartItem);
  // 3. First cancellation request
  const cancellationReason1: string & tags.MinLength<10> & tags.MaxLength<500> =
    RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }) satisfies string & tags.MinLength<10> & tags.MaxLength<500>;
  const cancellationRequest1: IShoppingMallCancellationRequest.IRequest = {
    reason: cancellationReason1,
  } satisfies IShoppingMallCancellationRequest.IRequest;
  // Use SDK function directly since no utility function exists for cancellation request creation
  const response1 =
    await api.functional.shoppingMall.customer.order_items.cancel_request.create(
      customerConnection,
      {
        itemId: cartItemWithId.id,
        body: cancellationRequest1,
      },
    );
  typia.assert(response1);
  TestValidator.equals(
    "first cancellation request status is pending",
    response1.status,
    "pending",
  );
  // 4. Second (duplicate) cancellation request - should fail with 409 Conflict
  const cancellationReason2: string & tags.MinLength<10> & tags.MaxLength<500> =
    RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 8,
      wordMax: 15,
    }) satisfies string & tags.MinLength<10> & tags.MaxLength<500>;
  const cancellationRequest2: IShoppingMallCancellationRequest.IRequest = {
    reason: cancellationReason2,
  } satisfies IShoppingMallCancellationRequest.IRequest;
  // Verify that duplicate request fails with 409 Conflict
  await TestValidator.httpError(
    "duplicate cancellation request should return 409 Conflict",
    409,
    async () => {
      await api.functional.shoppingMall.customer.order_items.cancel_request.create(
        customerConnection,
        {
          itemId: cartItemWithId.id,
          body: cancellationRequest2,
        },
      );
    },
  );
  // 5. Verify original request remains unchanged
  const verificationResponse =
    await api.functional.shoppingMall.customer.order_items.cancel_request.create(
      customerConnection,
      {
        itemId: cartItemWithId.id,
        body: cancellationRequest1,
      },
    );
  typia.assert(verificationResponse);
  TestValidator.equals(
    "original request unchanged",
    verificationResponse.status,
    "pending",
  );
  TestValidator.equals(
    "original request reason unchanged",
    verificationResponse.reason,
    cancellationReason1,
  );
}