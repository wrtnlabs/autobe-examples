import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipments_own_orders_only(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that a customer can browse only the shipment summaries that belong
   * to their own orders.
   *
   * The test authenticates a customer, queries the shipment listing using the
   * default pagination-style request, and checks that the response is a stable
   * read-only page of shipment summaries. It also validates the nested order and
   * seller references exposed by each summary so the endpoint remains scoped to
   * the authenticated customer.
   *
   * 1. Register and authenticate a customer account.
   * 2. Call the shipment listing endpoint with ordinary pagination defaults.
   * 3. Validate pagination metadata and shipment summary fields.
   * 4. Repeat the same read and ensure the response remains unchanged.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: `customer_${RandomGenerator.alphaNumeric(8)}@test.com` as string &
        tags.Format<"email">,
      password: "1234" as string & tags.Format<"password">,
      href: "https://example.com/register" as string & tags.Format<"uri">,
      referrer: "https://example.com" as string & tags.Format<"uri">,
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const request = {
    page: 1,
    limit: 10,
  } satisfies IMallPlatformShipment.IRequest;
  const first = await api.functional.mallPlatform.customer.shipments.index(
    customerConnection,
    {
      body: request,
    },
  );
  typia.assert(first);
  const second = await api.functional.mallPlatform.customer.shipments.index(
    customerConnection,
    {
      body: request,
    },
  );
  typia.assert(second);
  TestValidator.equals("pagination current page", first.pagination.current, 1);
  TestValidator.equals("pagination limit", first.pagination.limit, 10);
  TestValidator.equals(
    "pagination metadata is stable across reads",
    first.pagination,
    second.pagination,
  );
  TestValidator.equals(
    "shipment page is stable across reads",
    first.data,
    second.data,
  );
  TestValidator.predicate(
    "each shipment belongs to the authenticated customer",
    first.data.every((shipment) => {
      TestValidator.equals(
        "shipment order customer id matches authenticated customer",
        shipment.order.customer.id,
        customer.id,
      );
      TestValidator.predicate(
        "shipment seller summary exists",
        shipment.seller.id.length > 0,
      );
      TestValidator.predicate(
        "shipment order summary exists",
        shipment.order.id.length > 0,
      );
      TestValidator.predicate(
        "shipment has carrier name",
        shipment.carrierName.length > 0,
      );
      TestValidator.predicate(
        "shipment has tracking number",
        shipment.trackingNumber.length > 0,
      );
      TestValidator.predicate(
        "shipment has status",
        shipment.status.length > 0,
      );
      TestValidator.predicate(
        "shipment has created timestamp",
        shipment.createdAt.length > 0,
      );
      TestValidator.predicate(
        "shipment has updated timestamp",
        shipment.updatedAt.length > 0,
      );
      return true;
    }),
  );
}
