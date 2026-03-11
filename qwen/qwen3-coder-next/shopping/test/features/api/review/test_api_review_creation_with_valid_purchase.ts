import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
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
import { generate_random_ecommerce_mall_customer_products_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_products_reviews_create";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_review_creation_with_valid_purchase(
  connection: api.IConnection,
): Promise<void> {
  const sellerEmail = typia.random<
    string & tags.Format<"email">
  >() satisfies string as string & tags.Format<"email"> & tags.MinLength<1>;
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const customerEmail = typia.random<
    string & tags.Format<"email">
  >() satisfies string as string & tags.Format<"email"> & tags.MinLength<1>;
  const customerPassword = RandomGenerator.alphaNumeric(16);
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        shop_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 2. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customer);
  // 3. Seller login
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogged = await api.functional.ecommerceMall.auth.seller.login(
    sellerLoginConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(sellerLogged);
  // 4. Customer login
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLogged = await api.functional.ecommerceMall.auth.customer.login(
    customerLoginConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: "https://example.com/login",
        referrer: "https://example.com/home",
      } satisfies IEcommerceMallCustomer.ILogin,
    },
  );
  typia.assert(customerLogged);
  // 5. Customer places an order
  const order = await api.functional.ecommerceMall.customer.orders.create(
    customerLoginConnection,
  );
  typia.assert(order);
  // 6. Seller creates shipment for the order
  const shipment =
    await api.functional.ecommerceMall.seller.orders.shipments.create(
      sellerLoginConnection,
      {
        orderId: order.id,
        body: {
          order_items: order.order_items.map((item) => item.id),
          carrier_name: "Kuroneko Yamato",
          tracking_number: RandomGenerator.alphaNumeric(16),
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 7. Customer creates a review for a delivered order item
  const orderItem = order.order_items[0];
  const review =
    await api.functional.ecommerceMall.customer.products.reviews.create(
      customerLoginConnection,
      {
        productId: orderItem.product.id,
        body: {
          order_item_id: orderItem.id,
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >() satisfies number as number,
          text_content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review);
  // 8. Validate review
  TestValidator.predicate(
    "rating is valid",
    review.rating >= 1 && review.rating <= 5,
  );
}
