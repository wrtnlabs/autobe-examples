import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_addresses_retrieval_filtered_city(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer sign up
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "http://localhost/",
      referrer: "http://localhost/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // 2. Generate sample cities with 'New' in name for testing
  const cityNames = [
    "New York",
    "New Orleans",
    "Newcastle",
    "New Haven",
    "New London",
    "Newport",
  ];
  // 3. Test 'New' partial city match filter
  const filteredAddresses =
    await api.functional.ecommerce.customer.addresses.index(
      customerConnection,
      {
        body: {
          city: "New",
          page: 1,
          limit: 5,
        } satisfies IEcommerceCustomerAddress.IRequest,
      },
    );
  typia.assert(filteredAddresses);
  // 4. Validate all cities with 'New' in name are found
  const filteredCities = filteredAddresses.data.map((addr) => addr.city);
  cityNames.forEach((city) => {
    TestValidator.predicate(
      `City '${city}' should be found in results`,
      filteredCities.includes(city),
    );
  });
  // 5. Test with empty city filter
  const emptyFilteredAddresses =
    await api.functional.ecommerce.customer.addresses.index(
      customerConnection,
      {
        body: {
          city: "",
          page: 1,
          limit: 5,
        } satisfies IEcommerceCustomerAddress.IRequest,
      },
    );
  typia.assert(emptyFilteredAddresses);
  TestValidator.equals(
    "Should return 0 addresses with empty city filter",
    emptyFilteredAddresses.data.length,
    0,
  );
}
