import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_shipments_filter_and_paginate(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const order = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    {
      orderId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(order);
  const shipments = order.shipments;
  TestValidator.predicate(
    "shipment list should be readable from order detail",
    Array.isArray(shipments),
  );
  const fullList =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          shopping_mall_order_id: order.id,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(fullList);
  TestValidator.equals(
    "order-scoped shipment list should return the first page",
    fullList.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested page size should be reflected in pagination metadata",
    fullList.pagination.limit,
    100,
  );
  TestValidator.equals(
    "record count should match returned rows when all shipments fit on one page",
    fullList.pagination.records,
    fullList.data.length,
  );
  TestValidator.predicate(
    "all returned shipments should belong to the requested order",
    fullList.data.every((shipment) => shipment.order.id === order.id),
  );
  if (fullList.data.length > 0) {
    const sampleShipment = fullList.data[0];
    const byCarrier =
      await api.functional.shoppingMall.customer.orders.shipments.index(
        customerConnection,
        {
          orderId: order.id,
          body: {
            shopping_mall_order_id: order.id,
            carrier_name: sampleShipment.carrierName,
            page: 1,
            limit: 100,
          } satisfies IShoppingMallShipment.IRequest,
        },
      );
    typia.assert(byCarrier);
    TestValidator.predicate(
      "carrier filter should return only matching shipments",
      byCarrier.data.every(
        (shipment) => shipment.carrierName === sampleShipment.carrierName,
      ),
    );
    TestValidator.predicate(
      "carrier filter should not return unrelated shipments",
      byCarrier.data.every((shipment) => shipment.order.id === order.id),
    );
    const byTracking =
      await api.functional.shoppingMall.customer.orders.shipments.index(
        customerConnection,
        {
          orderId: order.id,
          body: {
            shopping_mall_order_id: order.id,
            tracking_number: sampleShipment.trackingNumber,
            page: 1,
            limit: 100,
          } satisfies IShoppingMallShipment.IRequest,
        },
      );
    typia.assert(byTracking);
    TestValidator.predicate(
      "tracking filter should return only matching shipments",
      byTracking.data.every(
        (shipment) => shipment.trackingNumber === sampleShipment.trackingNumber,
      ),
    );
    const byStatus =
      await api.functional.shoppingMall.customer.orders.shipments.index(
        customerConnection,
        {
          orderId: order.id,
          body: {
            shopping_mall_order_id: order.id,
            status: sampleShipment.status,
            page: 1,
            limit: 100,
          } satisfies IShoppingMallShipment.IRequest,
        },
      );
    typia.assert(byStatus);
    TestValidator.predicate(
      "status filter should return only matching shipments",
      byStatus.data.every(
        (shipment) => shipment.status === sampleShipment.status,
      ),
    );
    const from = sampleShipment.shippedAt ?? sampleShipment.deliveredAt;
    if (from !== null) {
      const byDate =
        await api.functional.shoppingMall.customer.orders.shipments.index(
          customerConnection,
          {
            orderId: order.id,
            body: {
              shopping_mall_order_id: order.id,
              shipped_at_from: from,
              shipped_at_to: from,
              page: 1,
              limit: 100,
            } satisfies IShoppingMallShipment.IRequest,
          },
        );
      typia.assert(byDate);
      TestValidator.predicate(
        "date filter should return shipments within the requested range",
        byDate.data.every(
          (shipment) =>
            shipment.shippedAt === null ||
            shipment.shippedAt === from ||
            (shipment.deliveredAt !== null && shipment.deliveredAt === from),
        ),
      );
    }
    if (fullList.pagination.records > 1) {
      const firstPage =
        await api.functional.shoppingMall.customer.orders.shipments.index(
          customerConnection,
          {
            orderId: order.id,
            body: {
              shopping_mall_order_id: order.id,
              page: 1,
              limit: 1,
            } satisfies IShoppingMallShipment.IRequest,
          },
        );
      typia.assert(firstPage);
      const secondPage =
        await api.functional.shoppingMall.customer.orders.shipments.index(
          customerConnection,
          {
            orderId: order.id,
            body: {
              shopping_mall_order_id: order.id,
              page: 2,
              limit: 1,
            } satisfies IShoppingMallShipment.IRequest,
          },
        );
      typia.assert(secondPage);
      TestValidator.equals(
        "first page should contain one shipment when limit is one",
        firstPage.data.length,
        1,
      );
      TestValidator.equals(
        "second page should contain one shipment when enough shipments exist",
        secondPage.data.length,
        1,
      );
      TestValidator.notEquals(
        "different pages should not return the same shipment",
        firstPage.data[0]?.id,
        secondPage.data[0]?.id,
      );
      TestValidator.equals(
        "first page metadata should be 1",
        firstPage.pagination.current,
        1,
      );
      TestValidator.equals(
        "second page metadata should be 2",
        secondPage.pagination.current,
        2,
      );
      TestValidator.equals(
        "page limit metadata should match requested limit",
        firstPage.pagination.limit,
        1,
      );
    }
  }
}
