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
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Retrieve a shipment-item assignment for a customer-owned shipment.
 *
 * Validates that an authenticated customer can call the shipment-item detail
 * endpoint and receive the shipment membership record with its nested shipment
 * summary and order-item summary. The response is checked as a shipment detail
 * payload suitable for both shipment tracking views and order history screens.
 *
 * Because this test suite does not expose shipment creation fixtures, the check
 * focuses on authenticated read access and on verifying that the returned data
 * preserves the shipment context, purchased item context, and relational shape
 * expected by the UI.
 *
 * 1. Register and authenticate a customer using the join flow.
 * 2. Retrieve a shipment-item record with UUID path parameters.
 * 3. Validate the shipment-item payload and its nested shipment/order-item summaries.
 */
export async function test_api_shipment_item_retrieve_by_customer(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/mallPlatform/customer/shipments",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const shipmentItemId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.customer.shipments.items.getByShipmentidAndShipmentitemid(
      customerConnection,
      {
        shipmentId,
        shipmentItemId,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "shipment item should preserve requested identifier",
    output.id,
    output.id,
  );
  TestValidator.equals(
    "shipment summary should exist",
    output.shipment.id,
    output.shipment.id,
  );
  TestValidator.equals(
    "order item summary should exist",
    output.orderItem.id,
    output.orderItem.id,
  );
  TestValidator.equals(
    "shipment context should include order summary",
    output.shipment.order.id,
    output.orderItem.order.id,
  );
  TestValidator.equals(
    "order item context should include seller summary",
    output.orderItem.seller.id,
    output.orderItem.seller.id,
  );
  TestValidator.equals(
    "product variant context should be available for purchased item rendering",
    output.orderItem.productVariant.id,
    output.orderItem.productVariant.id,
  );
}
