import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentOrderItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipment_order_items_index_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      shopName: "Test Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuthorized);
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 2. Prepare pagination request body with default no filters, fetch page 1 limit 10
  const requestBody: IShoppingMallShipmentOrderItem.IRequest = {
    page: 1,
    limit: 10,
  };
  // 3. Fetch paginated shipment order items list as seller
  const response =
    await api.functional.shoppingMall.seller.shipmentOrderItems.index(
      sellerConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 4. Validate pagination
  TestValidator.predicate(
    "pagination current is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is between 1 and 100",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination current matches request",
    response.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    requestBody.limit,
  );
  TestValidator.predicate(
    "pages is correct or zero when records zero",
    response.pagination.pages === 0 ||
      response.pagination.pages ===
        Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 5. Validate each shipment order item summary structure
  for (const item of response.data) {
    typia.assert(item);
    TestValidator.predicate(
      "shipmentOrderItem id looks like UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.id,
      ),
    );
    TestValidator.predicate(
      "shipmentOrderItem shoppingMallShipmentId looks like UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.shoppingMallShipmentId,
      ),
    );
    TestValidator.predicate(
      "shipmentOrderItem shoppingMallOrderItemId looks like UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.shoppingMallOrderItemId,
      ),
    );
    // Validate timestamps
    TestValidator.predicate(
      "createdAt timestamp ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(item.createdAt),
    );
    TestValidator.predicate(
      "updatedAt timestamp ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(item.updatedAt),
    );
    // deletedAt nullable check
    TestValidator.predicate(
      "deletedAt is either null or ISO format",
      item.deletedAt === null ||
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
          item.deletedAt ?? "",
        ),
    );
    // Validate shipment relation
    typia.assert(item.shipment);
    TestValidator.predicate(
      "shipment id looks like UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.shipment.id,
      ),
    );
    TestValidator.predicate(
      "shipment status is non-empty string",
      typeof item.shipment.status === "string" &&
        item.shipment.status.length > 0,
    );
    TestValidator.predicate(
      "shipment createdAt timestamp ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        item.shipment.createdAt,
      ),
    );
    TestValidator.predicate(
      "shipment updatedAt timestamp ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        item.shipment.updatedAt,
      ),
    );
    TestValidator.predicate(
      "shipment deletedAt null or ISO format",
      item.shipment.deletedAt === null ||
        item.shipment.deletedAt === undefined ||
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
          item.shipment.deletedAt ?? "",
        ),
    );
    // Validate seller summary inside shipment
    typia.assert(item.shipment.seller);
    TestValidator.predicate(
      "seller id looks like UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.shipment.seller.id,
      ),
    );
    TestValidator.predicate(
      "seller email is a string",
      typeof item.shipment.seller.email === "string" &&
        item.shipment.seller.email.length > 0,
    );
    TestValidator.predicate(
      "seller shopName is a string",
      typeof item.shipment.seller.shopName === "string" &&
        item.shipment.seller.shopName.length > 0,
    );
    // Optional fields can be null or string
    TestValidator.predicate(
      "seller shopDescription is string or null or undefined",
      item.shipment.seller.shopDescription === null ||
        item.shipment.seller.shopDescription === undefined ||
        typeof item.shipment.seller.shopDescription === "string",
    );
    TestValidator.predicate(
      "seller logoUri is string or null or undefined",
      item.shipment.seller.logoUri === null ||
        item.shipment.seller.logoUri === undefined ||
        typeof item.shipment.seller.logoUri === "string",
    );
    TestValidator.predicate(
      "seller approvalStatus is non-empty string",
      typeof item.shipment.seller.approvalStatus === "string" &&
        item.shipment.seller.approvalStatus.length > 0,
    );
    // Optional rejectionReason
    TestValidator.predicate(
      "seller rejectionReason is null or string or undefined",
      item.shipment.seller.rejectionReason === null ||
        item.shipment.seller.rejectionReason === undefined ||
        typeof item.shipment.seller.rejectionReason === "string",
    );
    // Validate orderItem relation
    typia.assert(item.orderItem);
    TestValidator.predicate(
      "orderItem id looks like UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.orderItem.id,
      ),
    );
    TestValidator.predicate(
      "orderItem quantity is integer and positive",
      Number.isInteger(item.orderItem.quantity) && item.orderItem.quantity >= 0,
    );
    TestValidator.predicate(
      "orderItem status is one of valid enum",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        item.orderItem.status,
      ),
    );
    TestValidator.predicate(
      "orderItem createdAt timestamp ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        item.orderItem.createdAt,
      ),
    );
    TestValidator.predicate(
      "orderItem updatedAt timestamp ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        item.orderItem.updatedAt,
      ),
    );
    TestValidator.predicate(
      "orderItem deletedAt is null or ISO format",
      item.orderItem.deletedAt === null ||
        item.orderItem.deletedAt === undefined ||
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
          item.orderItem.deletedAt ?? "",
        ),
    );
    // Validate order inside orderItem
    typia.assert(item.orderItem.order);
    TestValidator.predicate(
      "order id looks like UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.orderItem.order.id,
      ),
    );
    TestValidator.predicate(
      "order orderNumber is a non-empty string",
      typeof item.orderItem.order.orderNumber === "string" &&
        item.orderItem.order.orderNumber.length > 0,
    );
    TestValidator.predicate(
      "order totalPrice is non-negative number",
      typeof item.orderItem.order.totalPrice === "number" &&
        item.orderItem.order.totalPrice >= 0,
    );
    TestValidator.predicate(
      "order totalQuantity is integer and positive",
      Number.isInteger(item.orderItem.order.totalQuantity) &&
        item.orderItem.order.totalQuantity >= 0,
    );
    TestValidator.predicate(
      "order orderStatus is a non-empty string",
      typeof item.orderItem.order.orderStatus === "string" &&
        item.orderItem.order.orderStatus.length > 0,
    );
    TestValidator.predicate(
      "order createdAt timestamp ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        item.orderItem.order.createdAt,
      ),
    );
    TestValidator.predicate(
      "order updatedAt timestamp ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        item.orderItem.order.updatedAt,
      ),
    );
    TestValidator.predicate(
      "order deletedAt null or ISO format",
      item.orderItem.order.deletedAt === null ||
        item.orderItem.order.deletedAt === undefined ||
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
          item.orderItem.order.deletedAt ?? "",
        ),
    );
    // Validate customer inside order
    typia.assert(item.orderItem.order.customer);
    TestValidator.predicate(
      "customer id looks like UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.orderItem.order.customer.id,
      ),
    );
    TestValidator.predicate(
      "customer email is string",
      typeof item.orderItem.order.customer.email === "string" &&
        item.orderItem.order.customer.email.length > 0,
    );
    TestValidator.predicate(
      "customer displayName is string or null or undefined",
      item.orderItem.order.customer.displayName === null ||
        item.orderItem.order.customer.displayName === undefined ||
        typeof item.orderItem.order.customer.displayName === "string",
    );
    TestValidator.predicate(
      "customer phoneNumber is string or null or undefined",
      item.orderItem.order.customer.phoneNumber === null ||
        item.orderItem.order.customer.phoneNumber === undefined ||
        typeof item.orderItem.order.customer.phoneNumber === "string",
    );
    TestValidator.predicate(
      "customer createdAt timestamp ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        item.orderItem.order.customer.createdAt,
      ),
    );
    TestValidator.predicate(
      "customer updatedAt timestamp ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        item.orderItem.order.customer.updatedAt,
      ),
    );
    // Validate productVariant inside orderItem
    typia.assert(item.orderItem.productVariant);
    TestValidator.predicate(
      "productVariant id looks like UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.orderItem.productVariant.id,
      ),
    );
    TestValidator.predicate(
      "productVariant skuCode is a non-empty string",
      typeof item.orderItem.productVariant.skuCode === "string" &&
        item.orderItem.productVariant.skuCode.length > 0,
    );
    TestValidator.predicate(
      "productVariant priceOverride is number or null or undefined",
      item.orderItem.productVariant.priceOverride === null ||
        item.orderItem.productVariant.priceOverride === undefined ||
        typeof item.orderItem.productVariant.priceOverride === "number",
    );
    TestValidator.predicate(
      "productVariant stockQuantity is integer and positive",
      Number.isInteger(item.orderItem.productVariant.stockQuantity) &&
        item.orderItem.productVariant.stockQuantity >= 0,
    );
    TestValidator.predicate(
      "productVariant createdAt timestamp ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        item.orderItem.productVariant.createdAt,
      ),
    );
    TestValidator.predicate(
      "productVariant updatedAt timestamp ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        item.orderItem.productVariant.updatedAt,
      ),
    );
    TestValidator.predicate(
      "productVariant deletedAt null or ISO format",
      item.orderItem.productVariant.deletedAt === null ||
        item.orderItem.productVariant.deletedAt === undefined ||
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
          item.orderItem.productVariant.deletedAt ?? "",
        ),
    );
  }
}
