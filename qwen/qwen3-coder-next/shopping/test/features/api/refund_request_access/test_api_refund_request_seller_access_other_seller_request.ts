import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_refund_request_seller_access_other_seller_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Seller A with approved status
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA: IEcommerceMallSeller.IAuthorized =
    await api.functional.ecommerceMall.auth.seller.join(sellerAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
  typia.assert(sellerA);
  // 2. Create Seller B with approved status
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB: IEcommerceMallSeller.IAuthorized =
    await api.functional.ecommerceMall.auth.seller.join(sellerBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
  typia.assert(sellerB);
  // 3. Create customer and join
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await api.functional.ecommerceMall.auth.customer.join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://example.com/register",
        referrer: "https://example.com/referrer",
        ip: "127.0.0.1",
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 4. Customer login
  await api.functional.ecommerceMall.auth.customer.login(customerConnection, {
    body: {
      email: customer.customer.email,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/login",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 5. Seller A creates product
  // const product = await api.functional.ecommerceMall.seller.products.create(
  //   sellerAConnection,
  //   {
  //     body: {
  //       name: RandomGenerator.paragraph({ sentences: 2 }),
  //       base_price: typia.random<
  //         number & tags.Type<"uint32"> & tags.Minimum<1000>
  //       >(),
  //       description: RandomGenerator.content({ paragraphs: 2 }),
  //     } satisfies IEcommerceMallProduct.ICreate,
  //   },
  // );
  // typia.assert(product);
  // 6. Customer adds product to cart
  // await api.functional.ecommerceMall.customer.carts.create(customerConnection, {
  //   body: {
  //     product_id: product.id,
  //     variant_id: product.variants[0]?.id,
  //     quantity: 1,
  //   } satisfies IEcommerceMallCart.ICreate,
  // });
  // 7. Customer creates order
  // const order = await api.functional.ecommerceMall.customer.orders.create(
  //   customerConnection,
  //   {} satisfies IEcommerceMallOrder.ICreate,
  // );
  // typia.assert(order);
  // 8. Get order item from Seller A
  // const orderItem = order.items.find(
  //   (item) => item.seller.id === sellerA.seller.id,
  // );
  // if (!orderItem) throw new Error("Order item not found for Seller A");
  // 9. Customer requests refund for Seller A's order item
  const refundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: "test-order-item-id",
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 10. Seller B attempts to access the refund request (should fail)
  // Seller B login
  await api.functional.ecommerceMall.auth.seller.login(sellerBConnection, {
    body: {
      email: sellerB.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Attempt to get refund request (should return 403/404)
  await TestValidator.httpError(
    "Seller B cannot access refund request for Seller A's order",
    [403, 404],
    async () => {
      await api.functional.ecommerceMall.seller.refund_requests.at(
        sellerBConnection,
        {
          refundRequestId: refundRequest.id,
        },
      );
    },
  );
}