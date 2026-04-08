import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
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

/**
 * Verify that customer shipment browsing returns a valid empty page when no records match.
 *
 * This test validates the read-only browsing behavior for customer shipments and confirms that a highly restrictive filter combination produces a standard paginated response with zero matching rows instead of an error or any state-changing behavior.
 *
 * 1. Registers and authenticates a fresh customer account.
 * 2. Requests the customer shipment browse endpoint with filters that should not match any visible shipment records.
 * 3. Verifies the response remains a successful browse payload with empty data and consistent pagination metadata.
 */
export async function test_api_customer_shipments_empty_browse_result(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const response = await api.functional.mallPlatform.customer.shipments.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "delivered",
        carrierName: RandomGenerator.alphabets(16),
        trackingNumber: RandomGenerator.alphaNumeric(24),
        createdAtFrom: "2999-01-01T00:00:00.000Z",
        createdAtTo: "2999-01-02T00:00:00.000Z",
        shippedAtFrom: "2999-01-01T00:00:00.000Z",
        shippedAtTo: "2999-01-02T00:00:00.000Z",
        deliveredAtFrom: "2999-01-01T00:00:00.000Z",
        deliveredAtTo: "2999-01-02T00:00:00.000Z",
      } satisfies IMallPlatformShipment.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals("empty page current", response.pagination.current, 1);
  TestValidator.equals("empty page limit", response.pagination.limit, 10);
  TestValidator.equals("empty page records", response.pagination.records, 0);
  TestValidator.equals("empty page pages", response.pagination.pages, 0);
  TestValidator.equals("empty page data", response.data, []);
}
