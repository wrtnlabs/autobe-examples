import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentsOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentsOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipmentsOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentsOrderItem";
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
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_customer_shipments_order_items_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoined: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(sellerJoined);
  const sellerLoggedIn: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_login(sellerConnection, {
      body: {
        email: sellerJoined.email,
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(sellerLoggedIn);
  // 2. Setup: Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoined: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(customerJoined);
  const customerLoggedIn: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_login(customerConnection, {
      body: {
        email: customerJoined.email,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(customerLoggedIn);
  // 3. Generate shipment with multiple order items (seller creates shipment)
  const shipment: IEcommerceMallShipment =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: ArrayUtil.repeat(5, () =>
            typia.random<string & tags.Format<"uuid">>(),
          ),
          carrier_name: "DHL Express",
        },
      },
    );
  typia.assert(shipment);
  // 4. Customer retrieves order items from shipment (default pagination)
  const result: IPageIEcommerceMallShipmentsOrderItem.ISummary =
    await api.functional.ecommerceMall.customer.shipments.order_items.index(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {},
      },
    );
  typia.assert(result);
  // 5. Validate response structure and pagination metadata
  TestValidator.equals(
    "has pagination metadata",
    result.pagination !== undefined,
    true,
  );
  TestValidator.equals("has data array", result.data !== undefined, true);
  TestValidator.equals(
    "pagination current equals 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit equals 20",
    result.pagination.limit,
    20,
  );
  // 6. Validate each order item contains required fields
  TestValidator.equals("has 5 order items", result.data.length, 5);
  for (const orderItem of result.data) {
    typia.assert(orderItem);
    TestValidator.equals("order item has id", orderItem.id !== undefined, true);
    TestValidator.equals(
      "order item has shipped_quantity",
      orderItem.shipped_quantity !== undefined,
      true,
    );
    TestValidator.predicate(
      "shipped_quantity is non-negative",
      orderItem.shipped_quantity >= 0,
    );
    TestValidator.equals(
      "order item has shipment reference",
      orderItem.shipment !== undefined,
      true,
    );
    TestValidator.equals(
      "order item has orderItem snapshot",
      orderItem.orderItem !== undefined,
      true,
    );
    TestValidator.equals(
      "order item has product name",
      orderItem.orderItem.productName !== undefined,
      true,
    );
    TestValidator.equals(
      "order item has product SKU",
      orderItem.orderItem.productSku !== undefined,
      true,
    );
    TestValidator.equals(
      "order item has variant name",
      orderItem.orderItem.variantName !== undefined,
      true,
    );
    TestValidator.equals(
      "order item has quantity",
      orderItem.orderItem.quantity !== undefined,
      true,
    );
    TestValidator.equals(
      "order item has unit price",
      orderItem.orderItem.unitPrice !== undefined,
      true,
    );
    TestValidator.equals(
      "order item has total price",
      orderItem.orderItem.totalPrice !== undefined,
      true,
    );
    TestValidator.equals(
      "order item has created_at",
      orderItem.created_at !== undefined,
      true,
    );
  }
  // 7. Test sorting by shipped_quantity ascending
  const sortedAsc: IPageIEcommerceMallShipmentsOrderItem.ISummary =
    await api.functional.ecommerceMall.customer.shipments.order_items.index(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {
          sortBy: "shipped_quantity",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(sortedAsc);
  TestValidator.equals("sorted results count", sortedAsc.data.length, 5);
  // 8. Test sorting by shipped_quantity descending
  const sortedDesc: IPageIEcommerceMallShipmentsOrderItem.ISummary =
    await api.functional.ecommerceMall.customer.shipments.order_items.index(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {
          sortBy: "shipped_quantity",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(sortedDesc);
  // 9. Test pagination with limit 2 on page 1
  const page1Limited: IPageIEcommerceMallShipmentsOrderItem.ISummary =
    await api.functional.ecommerceMall.customer.shipments.order_items.index(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(page1Limited);
  TestValidator.equals(
    "page 1 limited results count",
    page1Limited.data.length,
    2,
  );
  TestValidator.equals(
    "page 1 limited current",
    page1Limited.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limited limit",
    page1Limited.pagination.limit,
    2,
  );
  // 10. Test sorting by created_at descending
  const sortByCreated: IPageIEcommerceMallShipmentsOrderItem.ISummary =
    await api.functional.ecommerceMall.customer.shipments.order_items.index(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(sortByCreated);
  TestValidator.equals(
    "created_at sort results count",
    sortByCreated.data.length,
    5,
  );
}
