import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import type { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";

export async function test_api_product_purchase_snapshot_historical_values_after_catalog_change(
  connection: api.IConnection,
): Promise<void> {
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "Password123!" as string & tags.Format<"password">;
  const customerHref = typia.random<string & tags.Format<"uri">>();
  const customerReferrer = typia.random<string & tags.Format<"uri">>();
  const customerIp = typia.random<string & tags.Format<"ipv4">>();
  const customerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerJoinConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: customerHref,
      referrer: customerReferrer,
      ip: customerIp,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: customerHref,
      referrer: customerReferrer,
      ip: customerIp,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: 100,
          gateway_provider: "test-gateway",
        } satisfies IShoppingMallPaymentAttempt.ICreate,
      },
    );
  typia.assert(paymentAttempt);
  const finalizedPaymentAttempt =
    await api.functional.shoppingMall.customer.paymentAttempts.update(
      customerConnection,
      {
        paymentAttemptId: paymentAttempt.id,
        body: {
          status: "succeeded",
          gateway_provider: paymentAttempt.gateway_provider,
          gateway_reference: `${paymentAttempt.gateway_reference}-final`,
          failure_reason: null,
          processed_at: new Date().toISOString(),
        } satisfies IShoppingMallPaymentAttempt.IUpdate,
      },
    );
  typia.assert(finalizedPaymentAttempt);
  const orders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "-created_at",
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(orders);
  TestValidator.predicate(
    "customer has at least one order",
    orders.data.length > 0,
  );
  const order = orders.data[0];
  const items = await api.functional.shoppingMall.customer.orders.items.index(
    customerConnection,
    {
      orderId: order.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(items);
  TestValidator.predicate("order has at least one item", items.data.length > 0);
  const item = items.data[0];
  const firstSnapshot =
    await api.functional.shoppingMall.customer.orders.items.productPurchaseSnapshots.getByOrderidAndItemid(
      customerConnection,
      {
        orderId: order.id,
        itemId: item.id,
      },
    );
  typia.assert(firstSnapshot);
  TestValidator.equals(
    "snapshot belongs to selected item",
    firstSnapshot.orderItem.id,
    item.id,
  );
  TestValidator.equals(
    "snapshot unit price matches selected item unit price",
    firstSnapshot.orderItem.unit_price,
    item.unit_price,
  );
  const historicalOptionValues = [...firstSnapshot.optionValues]
    .sort((a, b) => a.display_order - b.display_order)
    .map((value) => ({
      option_name: value.option_name,
      option_value: value.option_value,
      display_order: value.display_order,
    }));
  if (firstSnapshot.product !== null && firstSnapshot.productVariant !== null) {
    const sellerEmail = typia.random<string & tags.Format<"email">>();
    const sellerPassword = "Password123!" as string & tags.Format<"password">;
    const sellerHref = typia.random<string & tags.Format<"uri">>();
    const sellerReferrer = typia.random<string & tags.Format<"uri">>();
    const sellerIp = typia.random<string & tags.Format<"ipv4">>();
    const sellerJoinConnection: api.IConnection = { host: connection.host };
    await authorize_seller_join(sellerJoinConnection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: sellerHref,
        referrer: sellerReferrer,
        ip: sellerIp,
      } satisfies IShoppingMallSeller.IJoin,
    });
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_login(sellerConnection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: sellerHref,
        referrer: sellerReferrer,
        ip: sellerIp,
      } satisfies IShoppingMallSeller.ILogin,
    });
    const productUpdateBody = {
      name: `${firstSnapshot.product_name} updated ${RandomGenerator.alphabets(6)}`,
      description: `${firstSnapshot.product_description} ${RandomGenerator.paragraph({ sentences: 2 })}`,
      base_price: firstSnapshot.unit_price + 13,
    } satisfies IShoppingMallProduct.IUpdate;
    try {
      const updatedProduct =
        await api.functional.shoppingMall.seller.seller_products.update(
          sellerConnection,
          {
            productId: firstSnapshot.product.id,
            body: productUpdateBody,
          },
        );
      typia.assert(updatedProduct);
      TestValidator.notEquals(
        "live product name can diverge from historical product name",
        updatedProduct.name,
        firstSnapshot.product_name,
      );
      TestValidator.notEquals(
        "live product description can diverge from historical description",
        updatedProduct.description,
        firstSnapshot.product_description,
      );
    } catch (exp) {
      typia.assertGuard<Error>(exp);
    }
    const variantUpdateBody = {
      sku_code: `${firstSnapshot.sku_code}-${RandomGenerator.alphabets(4)}`,
      option_summary: `${firstSnapshot.productVariant.option_summary} ${RandomGenerator.alphabets(4)}`,
      price: firstSnapshot.unit_price + 17,
    } satisfies IShoppingMallProductVariant.IUpdate;
    try {
      const updatedVariant =
        await api.functional.shoppingMall.seller.seller_products.variants.update(
          sellerConnection,
          {
            productId: firstSnapshot.product.id,
            variantId: firstSnapshot.productVariant.id,
            body: variantUpdateBody,
          },
        );
      typia.assert(updatedVariant);
      TestValidator.notEquals(
        "live variant sku can diverge from historical sku",
        updatedVariant.sku_code,
        firstSnapshot.sku_code,
      );
    } catch (exp) {
      typia.assertGuard<Error>(exp);
    }
  }
  const secondSnapshot =
    await api.functional.shoppingMall.customer.orders.items.productPurchaseSnapshots.getByOrderidAndItemid(
      customerConnection,
      {
        orderId: order.id,
        itemId: item.id,
      },
    );
  typia.assert(secondSnapshot);
  const secondHistoricalOptionValues = [...secondSnapshot.optionValues]
    .sort((a, b) => a.display_order - b.display_order)
    .map((value) => ({
      option_name: value.option_name,
      option_value: value.option_value,
      display_order: value.display_order,
    }));
  TestValidator.equals(
    "snapshot still belongs to selected item after catalog change",
    secondSnapshot.orderItem.id,
    item.id,
  );
  TestValidator.equals(
    "historical product name preserved",
    secondSnapshot.product_name,
    firstSnapshot.product_name,
  );
  TestValidator.equals(
    "historical product description preserved",
    secondSnapshot.product_description,
    firstSnapshot.product_description,
  );
  TestValidator.equals(
    "historical sku preserved",
    secondSnapshot.sku_code,
    firstSnapshot.sku_code,
  );
  TestValidator.equals(
    "historical unit price preserved",
    secondSnapshot.unit_price,
    firstSnapshot.unit_price,
  );
  TestValidator.equals(
    "historical option values preserved",
    secondHistoricalOptionValues,
    historicalOptionValues,
  );
  if (firstSnapshot.product !== null && secondSnapshot.product !== null) {
    TestValidator.equals(
      "traceability product id remains stable when present",
      secondSnapshot.product.id,
      firstSnapshot.product.id,
    );
  }
  if (
    firstSnapshot.productVariant !== null &&
    secondSnapshot.productVariant !== null
  ) {
    TestValidator.equals(
      "traceability variant id remains stable when present",
      secondSnapshot.productVariant.id,
      firstSnapshot.productVariant.id,
    );
  }
}
