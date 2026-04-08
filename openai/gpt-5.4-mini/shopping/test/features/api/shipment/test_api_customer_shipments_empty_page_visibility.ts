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

/**
 * Verifies that an authenticated customer receives an empty paginated shipment page when no shipments match the query.
 *
 * This test creates a fresh customer account with no shipment history, then requests the customer shipment list using search criteria that should match nothing. It validates that the endpoint returns an empty page instead of an error, that pagination metadata correctly reports zero records and zero pages, and that repeated reads remain stable without mutating shipment state or leaking other customers' shipment data.
 *
 * 1. Register and authenticate a fresh customer account.
 * 2. Request the customer shipment list with criteria expected to return no matches.
 * 3. Validate the response is an empty paginated page.
 * 4. Call the same endpoint again to ensure the read-only result remains unchanged.
 */
export async function test_api_customer_shipments_empty_page_visibility(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const request = {
    page: 1,
    limit: 20,
    search: `no-shipment-${RandomGenerator.alphabets(12)}`,
    sort: "newest",
  } satisfies IMallPlatformShipment.IRequest;
  const first = await api.functional.mallPlatform.customer.shipments.index(
    customerConnection,
    {
      body: request,
    },
  );
  typia.assert(first);
  TestValidator.equals("empty shipment list", first.data.length, 0);
  TestValidator.equals("zero records", first.pagination.records, 0);
  TestValidator.equals("zero pages", first.pagination.pages, 0);
  TestValidator.equals("current page", first.pagination.current, request.page);
  TestValidator.equals("limit", first.pagination.limit, request.limit);
  const second = await api.functional.mallPlatform.customer.shipments.index(
    customerConnection,
    {
      body: request,
    },
  );
  typia.assert(second);
  TestValidator.equals(
    "repeat request data remains empty",
    second.data.length,
    0,
  );
  TestValidator.equals(
    "repeat request zero records",
    second.pagination.records,
    0,
  );
  TestValidator.equals("repeat request zero pages", second.pagination.pages, 0);
  TestValidator.equals(
    "repeat request current page",
    second.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "repeat request limit",
    second.pagination.limit,
    request.limit,
  );
  TestValidator.equals("read-only repeated response", second, first);
}
