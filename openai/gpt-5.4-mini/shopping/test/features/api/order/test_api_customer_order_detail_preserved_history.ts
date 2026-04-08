import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_detail_preserved_history(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const orderId = customer.id as string & tags.Format<"uuid">;
  const order = await api.functional.mallPlatform.customer.orders.at(
    customerConnection,
    {
      orderId,
    },
  );
  typia.assert(order);
  TestValidator.equals("order customer id", order.customer.id, customer.id);
  TestValidator.equals(
    "order customer email",
    order.customer.email,
    customer.email,
  );
  TestValidator.predicate(
    "order number is present",
    order.orderNumber.length > 0,
  );
  TestValidator.predicate(
    "order total amount is non-negative",
    order.totalAmount >= 0,
  );
  TestValidator.predicate(
    "recipient name is present",
    order.recipientName.length > 0,
  );
  TestValidator.predicate(
    "recipient phone is present",
    order.recipientPhone.length > 0,
  );
  TestValidator.predicate(
    "street address is present",
    order.streetAddress.length > 0,
  );
  TestValidator.predicate("city is present", order.city.length > 0);
  TestValidator.predicate(
    "state or province is present",
    order.stateProvince.length > 0,
  );
  TestValidator.predicate(
    "postal code is present",
    order.postalCode.length > 0,
  );
  TestValidator.predicate("country is present", order.country.length > 0);
  TestValidator.predicate(
    "order items are preserved",
    order.orderItems.length > 0,
  );
  TestValidator.predicate(
    "shipments are preserved",
    Array.isArray(order.shipments),
  );
  for (const item of order.orderItems) {
    typia.assert(item);
    TestValidator.equals("item order id", item.order.id, order.id);
    TestValidator.predicate("item quantity is positive", item.quantity > 0);
    TestValidator.predicate("item status is present", item.status.length > 0);
    TestValidator.predicate(
      "item created at is present",
      item.created_at.length > 0,
    );
    TestValidator.predicate(
      "item updated at is present",
      item.updated_at.length > 0,
    );
    TestValidator.equals(
      "item product summary is linked",
      item.productVariant.product.id,
      item.productVariant.product.id,
    );
    TestValidator.equals(
      "item seller summary is linked",
      item.seller.id,
      item.seller.id,
    );
  }
  for (const shipment of order.shipments) {
    typia.assert(shipment);
    TestValidator.equals("shipment order id", shipment.order.id, order.id);
    TestValidator.predicate(
      "shipment carrier is present",
      shipment.carrierName.length > 0,
    );
    TestValidator.predicate(
      "shipment tracking number is present",
      shipment.trackingNumber.length > 0,
    );
    TestValidator.predicate(
      "shipment status is present",
      shipment.status.length > 0,
    );
    TestValidator.predicate(
      "shipment created at is present",
      shipment.createdAt.length > 0,
    );
  }
}
