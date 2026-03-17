import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
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
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";

export async function test_api_order_items_shipment_grouping_visibility(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          gateway_provider: RandomGenerator.alphabets(8),
        },
      },
    );
  typia.assert(paymentAttempt);
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const baseRequest = {
    page: 1 satisfies number as number,
    limit: 100 satisfies number as number,
    sort: "+created_at",
  } satisfies IShoppingMallOrderItem.IRequest;
  const baseline =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: baseRequest,
      },
    );
  typia.assert(baseline);
  const baselineIds = baseline.data.map((item) => item.id);
  const assignedItems = baseline.data.filter((item) => item.shipment !== null);
  const unassignedItems = baseline.data.filter(
    (item) => item.shipment === null,
  );
  TestValidator.predicate(
    "baseline page current is positive",
    baseline.pagination.current >= 1,
  );
  TestValidator.predicate(
    "baseline records cover data length",
    baseline.pagination.records >= baseline.data.length,
  );
  const nullShipmentPage =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          ...baseRequest,
          shopping_mall_shipment_id: null,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(nullShipmentPage);
  for (const item of nullShipmentPage.data) {
    TestValidator.equals(
      "null shipment filter keeps shipment null",
      item.shipment,
      null,
    );
    TestValidator.predicate(
      "null shipment filter stays within baseline set",
      baselineIds.includes(item.id),
    );
  }
  if (unassignedItems.length > 0) {
    TestValidator.predicate(
      "null shipment filter can isolate unassigned items",
      nullShipmentPage.data.length > 0,
    );
  }
  if (assignedItems.length > 0) {
    const firstAssignedItem = assignedItems[0];
    if (firstAssignedItem === undefined || firstAssignedItem.shipment === null) {
      throw new Error("Expected an assigned item with a shipment.");
    }
    const targetShipment = firstAssignedItem.shipment;
    const shipmentPage =
      await api.functional.shoppingMall.customer.orders.items.index(
        customerConnection,
        {
          orderId,
          body: {
            ...baseRequest,
            shopping_mall_shipment_id: targetShipment.id,
          } satisfies IShoppingMallOrderItem.IRequest,
        },
      );
    typia.assert(shipmentPage);
    for (const item of shipmentPage.data) {
      TestValidator.predicate(
        "shipment-specific filter returns assigned shipment only",
        item.shipment !== null && item.shipment.id === targetShipment.id,
      );
      TestValidator.predicate(
        "shipment-specific filter stays within baseline set",
        baselineIds.includes(item.id),
      );
    }
    const targetSellerId = assignedItems[0].seller.id;
    const sellerPage =
      await api.functional.shoppingMall.customer.orders.items.index(
        customerConnection,
        {
          orderId,
          body: {
            ...baseRequest,
            shopping_mall_seller_id: targetSellerId,
          } satisfies IShoppingMallOrderItem.IRequest,
        },
      );
    typia.assert(sellerPage);
    for (const item of sellerPage.data) {
      TestValidator.equals(
        "seller filter keeps items for one seller",
        item.seller.id,
        targetSellerId,
      );
      TestValidator.predicate(
        "seller filter stays within baseline set",
        baselineIds.includes(item.id),
      );
    }
    const distinctShipmentIds = Array.from(
      new Set(
        assignedItems
          .map((item) => item.shipment?.id)
          .filter((id): id is string => id !== undefined),
      ),
    );
    TestValidator.predicate(
      "assigned items expose shipment association item by item",
      assignedItems.every(
        (item) =>
          item.shipment !== null &&
          distinctShipmentIds.includes(item.shipment.id),
      ),
    );
    if (assignedItems.length > 0 && unassignedItems.length > 0) {
      TestValidator.predicate(
        "mixed shipment outcomes remain distinguishable item by item",
        baseline.data.some((item) => item.shipment === null) &&
          baseline.data.some((item) => item.shipment !== null),
      );
    }
    if (distinctShipmentIds.length > 1) {
      TestValidator.predicate(
        "multiple shipment groups remain distinguishable",
        baseline.data
          .filter((item) => item.shipment !== null)
          .some(
            (item, _index, array) =>
              array[0] !== undefined &&
              item.shipment !== null &&
              item.shipment.id !== array[0].shipment!.id,
          ),
      );
    }
  }
}
