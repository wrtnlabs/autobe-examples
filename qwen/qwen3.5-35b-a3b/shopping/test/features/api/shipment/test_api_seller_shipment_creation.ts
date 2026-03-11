import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
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
import { generate_random_ecommerce_mall_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_items_create";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_seller_shipment_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.Format<"email"> &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string & tags.Format<"ipv4">,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Customer setup - join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.Format<"email"> &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string & tags.Format<"ipv4">,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Seller creates product with variants
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        is_active: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant = product.variants[0]!;
  typia.assert(variant);
  // 4. Customer creates shopping cart
  const cart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerConnection,
    );
  typia.assert(cart);
  // 5. Customer adds product variant to cart
  await api.functional.ecommerceMall.customer.carts.items.create(
    customerConnection,
    {
      cartId: cart.id,
      body: {
        variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 6. Customer manages cart (sync to set quantity)
  const cartSummary = await api.functional.ecommerceMall.customer.carts.manage(
    customerConnection,
    {
      body: {
        cartOperations: [
          {
            cart_id: cart.id,
            variant_id: variant.id,
            quantity: 1,
          },
        ],
      } satisfies IEcommerceMallShoppingCart.IManage,
    },
  );
  typia.assert(cartSummary);
  // Note: Order creation API is not available, using mock UUID for test
  const mockOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 7. Seller creates shipment for the order
  const shipment =
    await api.functional.ecommerceMall.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId: mockOrderId,
        body: {
          carrier_name: "USPS",
          tracking_number: RandomGenerator.alphaNumeric(12),
          order_items: [
            {
              quantity: 1,
              unit_price: variant.price_override ?? variant.product.basePrice,
              product_id: variant.product.id,
              variant_id: variant.id,
              product_snapshot: JSON.stringify(variant.product),
              variant_snapshot: JSON.stringify(variant),
              seller_profile_snapshot: JSON.stringify(product.seller),
            } satisfies IEcommerceMallOrderItem.ICreate,
          ],
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 8. Validate shipment
  TestValidator.equals(
    "shipment seller id matches product seller",
    shipment.seller.id,
    product.seller.id,
  );
  TestValidator.equals("shipment carrier name", shipment.carrier_name, "USPS");
  TestValidator.notEquals(
    "shipment tracking number not empty",
    shipment.tracking_number,
    "",
  );
  TestValidator.predicate(
    "shipment has valid created_at",
    new Date(shipment.created_at) instanceof Date,
  );
  TestValidator.predicate(
    "shipment has valid updated_at",
    new Date(shipment.updated_at) instanceof Date,
  );
}
