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
import type { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_carts_items_create } from "../../../generate/generate_random_shopping_mall_customer_carts_items_create";
import { prepare_random_shopping_mall_shopping_cart_item } from "../../../prepare/prepare_random_shopping_mall_shopping_cart_item";

export async function test_api_customer_cancel_request_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first customer (Customer A) and log in
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerAConnection, {
      body: {
        email: RandomGenerator.alphabets(6) + "@test.com",
        password: "12345678",
        href: "https://example.com/join",
        referrer: "https://example.com/ref",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customerA);
  // 2. Create second customer (Customer B) for unauthorized access attempt
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerBConnection, {
      body: {
        email: RandomGenerator.alphabets(6) + "@test.com",
        password: "12345678",
        href: "https://example.com/join",
        referrer: "https://example.com/ref",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customerB);
  // 3. Create an order for Customer A (prerequisite for cancellation request)
  const cartItem =
    await generate_random_shopping_mall_customer_carts_items_create(
      customerAConnection,
      {
        body: {
          variant_id: RandomGenerator.alphaNumeric(36),
          quantity: 1,
        } satisfies IShoppingMallShoppingCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 4. Customer A submits a cancellation request
  const cancelRequest =
    await api.functional.shoppingMall.customer.cancel_requests.at(
      customerAConnection,
      {
        requestId: "00000000-0000-0000-0000-000000000000",
      },
    );
  typia.assert(cancelRequest);
  // 5. Customer B attempts to access Customer A's cancellation request (should be denied)
  await TestValidator.error(
    "customer B cannot access customer A's cancellation request",
    async () => {
      await api.functional.shoppingMall.customer.cancel_requests.at(
        customerBConnection,
        {
          requestId: cancelRequest.id,
        },
      );
    },
  );
}
