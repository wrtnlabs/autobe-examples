import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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

export async function test_api_shipping_addresses_customer_ownership_isolation(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test authenticated customer shipping-address isolation and empty-state behavior.
   *
   * Verifies that the shipping-address list endpoint returns only the currently
   * authenticated customer's own address book data. Because this scenario does not
   * create any addresses, it also validates the empty-page response shape and total
   * counters for a customer with no saved addresses.
   *
   * 1. Register a customer and use the issued authorization token on a dedicated connection.
   * 2. Request the saved shipping-address list with empty pagination criteria.
   * 3. Confirm the response is an empty page and only reflects the authenticated customer.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const page =
    await api.functional.mallPlatform.customer.shipping_addresses.index(
      customerConnection,
      {
        body: {} satisfies IMallPlatformShippingAddress.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "empty shipping-address list has zero records",
    page.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty shipping-address list has zero pages",
    page.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty shipping-address list has no data",
    page.data.length,
    0,
  );
  TestValidator.predicate(
    "shipping-address list belongs to the authenticated customer only",
    page.data.every((address) => address.customer.id === customer.id),
  );
}
