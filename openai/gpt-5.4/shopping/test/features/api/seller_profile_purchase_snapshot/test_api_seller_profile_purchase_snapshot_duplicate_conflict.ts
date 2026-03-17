import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_items_seller_profile_purchase_snapshots_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_seller_profile_purchase_snapshots_create";
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_profile_purchase_snapshot } from "../../../prepare/prepare_random_shopping_mall_seller_profile_purchase_snapshot";

export async function test_api_seller_profile_purchase_snapshot_duplicate_conflict(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >() satisfies number as number,
          status: "active",
        },
      },
    );
  typia.assert(product);
  const variantPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >() satisfies number as number;
  const variant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: `sku-${RandomGenerator.alphaNumeric(8)}`,
          option_summary: RandomGenerator.paragraph({ sentences: 3 }),
          price: variantPrice,
        },
      },
    );
  typia.assert(variant);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = typia.random<string & tags.Format<"password">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
  >() satisfies number as number;
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_variant_id: variant.id,
          quantity,
        },
      },
    );
  typia.assert(cartItem);
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: cartItem.subtotal,
          gateway_provider: "test-gateway",
        },
      },
    );
  typia.assert(paymentAttempt);
  const orders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(orders);
  TestValidator.predicate(
    "orders exist after successful payment",
    orders.data.length > 0,
  );
  const maybeOrder =
    orders.data.find(
      (candidate) => candidate.total_price === paymentAttempt.amount,
    ) ?? orders.data[0];
  TestValidator.predicate("target order is resolved", maybeOrder !== undefined);
  const order = typia.assert(maybeOrder);
  const orderItems =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(orderItems);
  TestValidator.predicate(
    "order items exist after checkout",
    orderItems.data.length > 0,
  );
  const maybeOrderItem =
    orderItems.data.find(
      (candidate) => candidate.productVariant.id === variant.id,
    ) ?? orderItems.data[0];
  TestValidator.predicate(
    "target order item is resolved",
    maybeOrderItem !== undefined,
  );
  const orderItem = typia.assert(maybeOrderItem);
  const snapshotBody = {
    shop_name: `shop-${RandomGenerator.name(2)}`,
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerProfilePurchaseSnapshot.ICreate;
  const createdSnapshot =
    await generate_random_shopping_mall_customer_orders_items_seller_profile_purchase_snapshots_create(
      customerConnection,
      {
        params: {
          orderId: order.id,
          itemId: orderItem.id,
        },
        body: snapshotBody,
      },
    );
  typia.assert(createdSnapshot);
  TestValidator.equals(
    "snapshot shop name matches input",
    createdSnapshot.shop_name,
    snapshotBody.shop_name,
  );
  TestValidator.equals(
    "snapshot logo uri matches input",
    createdSnapshot.logo_uri,
    snapshotBody.logo_uri ?? null,
  );
  TestValidator.equals(
    "snapshot order item matches target item",
    createdSnapshot.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "snapshot variant matches purchased item",
    createdSnapshot.orderItem.productVariant.id,
    orderItem.productVariant.id,
  );
  TestValidator.equals(
    "snapshot seller matches purchased item seller",
    createdSnapshot.orderItem.seller.id,
    orderItem.seller.id,
  );
  await TestValidator.httpError(
    "duplicate seller profile purchase snapshot is rejected as conflict",
    409,
    async () => {
      await api.functional.shoppingMall.customer.orders.items.sellerProfilePurchaseSnapshots.create(
        customerConnection,
        {
          orderId: order.id,
          itemId: orderItem.id,
          body: snapshotBody,
        },
      );
    },
  );
  const orderItemsAfterDuplicate =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(orderItemsAfterDuplicate);
  const maybeOrderItemAfterDuplicate = orderItemsAfterDuplicate.data.find(
    (candidate) => candidate.id === orderItem.id,
  );
  TestValidator.predicate(
    "same order item remains retrievable after duplicate snapshot attempt",
    maybeOrderItemAfterDuplicate !== undefined,
  );
  const orderItemAfterDuplicate = typia.assert(maybeOrderItemAfterDuplicate!);
  TestValidator.equals(
    "order item id unchanged after duplicate snapshot attempt",
    orderItemAfterDuplicate.id,
    orderItem.id,
  );
  TestValidator.equals(
    "order item seller unchanged after duplicate snapshot attempt",
    orderItemAfterDuplicate.seller.id,
    orderItem.seller.id,
  );
  TestValidator.equals(
    "order item variant unchanged after duplicate snapshot attempt",
    orderItemAfterDuplicate.productVariant.id,
    orderItem.productVariant.id,
  );
  TestValidator.equals(
    "order item quantity unchanged after duplicate snapshot attempt",
    orderItemAfterDuplicate.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "order item unit price unchanged after duplicate snapshot attempt",
    orderItemAfterDuplicate.unit_price,
    orderItem.unit_price,
  );
  TestValidator.equals(
    "original snapshot remains unchanged in shop name",
    createdSnapshot.shop_name,
    snapshotBody.shop_name,
  );
  TestValidator.equals(
    "original snapshot remains unchanged in logo uri",
    createdSnapshot.logo_uri,
    snapshotBody.logo_uri ?? null,
  );
}
