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
 * Test customer shipping-address list ownership isolation.
 *
 * Verifies that authenticated shipping-address list requests are restricted to the current customer account.
 *
 * 1. Registers two separate customer accounts for isolation checks.
 * 2. Queries the shipping-address list as the second customer using a search term that is unrelated to the second customer's own data.
 * 3. Confirms the response is a valid paginated page and that every returned address, if any, belongs to the authenticated second customer.
 * 4. Ensures no address from the first customer can appear in the second customer's result set.
 */
export async function test_api_shipping_address_list_customer_ownership_isolation(
  connection: api.IConnection,
): Promise<void> {
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(firstCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234" as string & tags.Format<"password">,
      href: "https://example.com/register" as string & tags.Format<"uri">,
      referrer: "https://example.com/landing" as string & tags.Format<"uri">,
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(firstCustomer);
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomer = await authorize_customer_join(
    secondCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234" as string & tags.Format<"password">,
        href: "https://example.com/register" as string & tags.Format<"uri">,
        referrer: "https://example.com/landing" as string & tags.Format<"uri">,
        ip: null,
      } satisfies IMallPlatformCustomer.IJoin,
    },
  );
  typia.assert(secondCustomer);
  const output =
    await api.functional.mallPlatform.customer.shipping_addresses.index(
      secondCustomerConnection,
      {
        body: {
          search: RandomGenerator.name(),
          page: 1,
          limit: 10,
        } satisfies IMallPlatformShippingAddress.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination metadata is valid for the authenticated customer's address list",
    output.pagination.current >= 0 &&
      output.pagination.limit >= 0 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "all returned shipping addresses belong to the second customer",
    output.data.every((address) => address.customer.id === secondCustomer.id),
  );
  TestValidator.predicate(
    "no returned shipping address belongs to the first customer",
    output.data.every((address) => address.customer.id !== firstCustomer.id),
  );
}
