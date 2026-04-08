import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verify empty shipping-address pagination for a newly registered customer.
 *
 * This test validates the empty-state behavior of the customer shipping-address
 * listing endpoint when the authenticated customer has not saved any addresses.
 * It ensures the API still returns a usable paginated page object for checkout
 * and address-management screens instead of failing or omitting pagination
 * metadata.
 *
 * 1. Register a new customer account with no saved shipping addresses.
 * 2. Request the shipping-address list with standard paging criteria.
 * 3. Confirm the response contains an empty data array and valid pagination metadata.
 */
export async function test_api_shipping_address_list_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Passw0rd!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const output =
    await api.functional.mallPlatform.customer.shipping_addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformShippingAddress.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals("empty address page data", output.data.length, 0);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.equals(
    "pagination total records",
    output.pagination.records,
    0,
  );
  TestValidator.equals("pagination total pages", output.pagination.pages, 0);
}
