import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_customer_order_retrieval_ownership_isolation(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // STEP 1: Authenticate as first customer
  // ============================================================
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(
    firstCustomerConnection,
    {},
  );
  typia.assert(firstCustomer);
  TestValidator.equals(
    "first customer has valid id",
    firstCustomer.id.length > 0,
    true,
  );
  // ============================================================
  // STEP 2: Create cart item for first customer
  // ============================================================
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      firstCustomerConnection,
      {},
    );
  typia.assert(cartItem);
  // ============================================================
  // STEP 3: Checkout to create order for first customer
  // ============================================================
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      firstCustomerConnection,
      {
        body: {
          payment_token:
            "test_payment_token_" + RandomGenerator.alphaNumeric(16),
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  TestValidator.equals(
    "order created successfully",
    order.orderNumber.length > 0,
    true,
  );
  // Extract the orderId from the first customer's order
  const firstCustomerOrderId = order.id;
  // ============================================================
  // STEP 4: Authenticate as second (different) customer
  // ============================================================
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomer = await authorize_customer_join(
    secondCustomerConnection,
    {},
  );
  typia.assert(secondCustomer);
  TestValidator.equals(
    "second customer has valid id",
    secondCustomer.id.length > 0,
    true,
  );
  TestValidator.notEquals(
    "second customer is different from first",
    secondCustomer.id,
    firstCustomer.id,
  );
  // ============================================================
  // STEP 5: Attempt to get first customer's order as second customer
  // This should fail with 404 due to ownership isolation
  // ============================================================
  await TestValidator.httpError(
    "second customer cannot access first customer's order - should return 404",
    404,
    async () => {
      await api.functional.ecommerceMall.customer.orders.at(
        secondCustomerConnection,
        {
          orderId: firstCustomerOrderId,
        },
      );
    },
  );
}
