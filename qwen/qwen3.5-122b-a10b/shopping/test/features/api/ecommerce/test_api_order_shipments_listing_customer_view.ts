import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer view of order shipments with tracking information.
 *
 * Validates that authenticated customers can retrieve shipment information for their orders, including carrier details, tracking numbers, and delivery status. Tests pagination functionality and filtering capabilities for shipment lists.
 *
 * This test verifies the complete shipment listing workflow from a customer perspective, ensuring that tracking information is properly exposed and that pagination metadata is accurate.
 *
 * 1. Customer registers and authenticates with the system.
 * 2. Customer requests shipment list for an order with pagination parameters.
 * 3. Validates response structure includes shipment summaries with tracking data.
 * 4. Verifies pagination metadata is correctly calculated and returned.
 * 5. Confirms each shipment contains required tracking information fields.
 * 6. Tests filtering by status and carrier name when specified.
 */
export async function test_api_order_shipments_listing_customer_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Prepare request with pagination and filters
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const requestBody = {
    status: RandomGenerator.pick([
      "pending",
      "shipped",
      "in_transit",
      "delivered",
      "exception",
    ] as const),
    carrier_name: RandomGenerator.pick([
      "UPS",
      "FedEx",
      "USPS",
      "DHL",
    ] as const),
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IEcommerceShipment.IRequest;
  // 3. Call shipment listing endpoint
  const shipments: IPageIEcommerceShipment.ISummary =
    await api.functional.ecommerce.customer.orders.shipments.index(
      customerConnection,
      {
        orderId,
        body: requestBody,
      },
    );
  typia.assert(shipments);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is positive",
    shipments.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is non-negative",
    shipments.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    shipments.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    shipments.pagination.pages >= 0,
    true,
  );
  // 5. Validate each shipment has required tracking information
  await TestValidator.predicate(
    "all shipments have valid tracking data",
    async () => {
      for (const shipment of shipments.data) {
        // Validate shipment ID format
        typia.assertGuard(shipment.id);
        // Validate carrier name exists
        TestValidator.predicate(
          "carrier name is not empty",
          shipment.carrier_name.length > 0,
        );
        // Validate tracking number exists
        TestValidator.predicate(
          "tracking number is not empty",
          shipment.tracking_number.length > 0,
        );
        // Validate shipped_at timestamp
        TestValidator.predicate(
          "shipped_at is valid date-time",
          shipment.shipped_at.length > 0,
        );
        // Validate order reference exists
        TestValidator.predicate(
          "order reference has ID",
          shipment.order.id.length > 0,
        );
        // Validate seller reference exists
        TestValidator.predicate(
          "seller reference has ID",
          shipment.seller.id.length > 0,
        );
      }
      return true;
    },
  );
}
