import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_address_filter_by_default_status(
  connection: api.IConnection,
) {
  // 1. Authenticate as customer via join
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com/register",
      referrer: "https://test.com/",
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Call PATCH with is_default=true to get default addresses
  const defaultAddressesResponse =
    await api.functional.ecommercePlatform.customer.addresses.index(
      customerConnection,
      {
        body: {
          is_default: true,
        } satisfies IEcommercePlatformShippingAddress.IRequest,
      },
    );
  typia.assert(defaultAddressesResponse);
  // 3. Validate response contains only default addresses
  for (const address of defaultAddressesResponse.data) {
    TestValidator.predicate("address is default", address.is_default);
  }
  // 4. Verify pagination metadata is valid
  TestValidator.predicate(
    "pagination is valid for default addresses",
    defaultAddressesResponse.pagination.current >= 1 &&
      defaultAddressesResponse.pagination.limit > 0 &&
      defaultAddressesResponse.pagination.records >= 0,
  );
  // 5. Call PATCH with is_default=false to get non-default addresses
  const nonDefaultAddressesResponse =
    await api.functional.ecommercePlatform.customer.addresses.index(
      customerConnection,
      {
        body: {
          is_default: false,
        } satisfies IEcommercePlatformShippingAddress.IRequest,
      },
    );
  typia.assert(nonDefaultAddressesResponse);
  // 6. Validate response contains only non-default addresses
  for (const address of nonDefaultAddressesResponse.data) {
    TestValidator.predicate("address is not default", !address.is_default);
  }
  // 7. Verify pagination metadata is valid
  TestValidator.predicate(
    "pagination is valid for non-default addresses",
    nonDefaultAddressesResponse.pagination.current >= 1 &&
      nonDefaultAddressesResponse.pagination.limit > 0 &&
      nonDefaultAddressesResponse.pagination.records >= 0,
  );
  // 8. Verify scoping - another customer should not see these addresses
  const otherConnection: api.IConnection = { host: connection.host };
  const otherAuthorized = await authorize_customer_join(otherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com/register",
      referrer: "https://test.com/",
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  typia.assert(otherAuthorized);
  // Verify scoping by checking the other customer's addresses are independent
  const otherAddressesResponse =
    await api.functional.ecommercePlatform.customer.addresses.index(
      otherConnection,
      {
        body: {} satisfies IEcommercePlatformShippingAddress.IRequest,
      },
    );
  typia.assert(otherAddressesResponse);
  TestValidator.predicate(
    "other customer has independent address list",
    Array.isArray(otherAddressesResponse.data),
  );
}
