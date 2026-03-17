import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_order_items_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // Create new connection with seller token for authenticated requests
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: seller.token.access },
  };
  // 2. Create shipment with order items
  const shipment: IEcommerceMallShipment =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerAuthConnection,
      {
        body: {
          carrier_name: RandomGenerator.alphaNumeric(10),
          carrier_phone: RandomGenerator.mobile(),
          carrier_website: "https://example.com" satisfies string as string & tags.Format<"uri"> & tags.MaxLength<80000>,
        },
      },
    );
  typia.assert(shipment);
  // 3. Retrieve order items for the shipment with pagination
  const requestPage1: IEcommerceMallShipmentsOrderItem.IRequest = {
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallShipmentsOrderItem.IRequest;
  const page1Result: IPageIEcommerceMallShipmentsOrderItem.ISummary =
    await api.functional.ecommerceMall.seller.shipments.order_items.index(
      sellerAuthConnection,
      {
        shipmentId: shipment.id,
        body: requestPage1,
      },
    );
  typia.assert(page1Result);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", page1Result.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is positive",
    page1Result.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    page1Result.pagination.pages >= 1,
  );
  // 5. Validate order items data
  TestValidator.equals(
    "order items count matches records",
    page1Result.data.length,
    page1Result.pagination.records,
  );
  for (const item of page1Result.data) {
    typia.assert(item);
    // Validate shipped_quantity is positive
    TestValidator.predicate(
      "shipped_quantity is positive",
      item.shipped_quantity > 0,
    );
    // Validate shipment reference is populated
    TestValidator.predicate(
      "shipment reference is populated",
      item.shipment.id !== undefined,
    );
    TestValidator.equals("shipment id matches", item.shipment.id, shipment.id);
    TestValidator.equals(
      "shipment status matches",
      item.shipment.status,
      shipment.status,
    );
    // Validate orderItem reference includes product information
    TestValidator.predicate(
      "orderItem reference is populated",
      item.orderItem.id !== undefined,
    );
    TestValidator.predicate(
      "productName is populated",
      item.orderItem.productName.length > 0,
    );
    TestValidator.predicate(
      "productSku is populated",
      item.orderItem.productSku.length > 0,
    );
    TestValidator.predicate(
      "variantName is populated",
      item.orderItem.variantName.length > 0,
    );
    // Validate timestamps
    TestValidator.predicate(
      "created_at is valid date-time",
      new Date(item.created_at).getTime() > 0,
    );
    TestValidator.predicate(
      "updated_at is valid date-time",
      new Date(item.updated_at).getTime() > 0,
    );
  }
  // 6. Test sorting with shipped_quantity ascending
  const sortedRequestAsc: IEcommerceMallShipmentsOrderItem.IRequest = {
    page: 1,
    limit: page1Result.pagination.records,
    sortBy: "shipped_quantity",
    sortOrder: "asc",
  } satisfies IEcommerceMallShipmentsOrderItem.IRequest;
  const sortedAscResult: IPageIEcommerceMallShipmentsOrderItem.ISummary =
    await api.functional.ecommerceMall.seller.shipments.order_items.index(
      sellerAuthConnection,
      {
        shipmentId: shipment.id,
        body: sortedRequestAsc,
      },
    );
  typia.assert(sortedAscResult);
  // Validate ascending order
  for (let i = 1; i < sortedAscResult.data.length; i++) {
    const prevItem = sortedAscResult.data[i - 1];
    const currentItem = sortedAscResult.data[i];
    TestValidator.predicate(
      "shipped_quantity ascending order",
      prevItem.shipped_quantity <= currentItem.shipped_quantity,
    );
  }
  // 7. Test sorting with shipped_quantity descending
  const sortedRequestDesc: IEcommerceMallShipmentsOrderItem.IRequest = {
    page: 1,
    limit: page1Result.pagination.records,
    sortBy: "shipped_quantity",
    sortOrder: "desc",
  } satisfies IEcommerceMallShipmentsOrderItem.IRequest;
  const sortedDescResult: IPageIEcommerceMallShipmentsOrderItem.ISummary =
    await api.functional.ecommerceMall.seller.shipments.order_items.index(
      sellerAuthConnection,
      {
        shipmentId: shipment.id,
        body: sortedRequestDesc,
      },
    );
  typia.assert(sortedDescResult);
  // Validate descending order
  for (let i = 1; i < sortedDescResult.data.length; i++) {
    const prevItem = sortedDescResult.data[i - 1];
    const currentItem = sortedDescResult.data[i];
    TestValidator.predicate(
      "shipped_quantity descending order",
      prevItem.shipped_quantity >= currentItem.shipped_quantity,
    );
  }
}