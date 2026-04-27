import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";

export async function test_api_customer_addresses_paginated_listing_with_defaults_first(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IECommerceMallCustomer.IJoin,
  });
  // 2. Create first address - non-default
  const address1 =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          is_default: false,
        },
      },
    );
  typia.assert(address1);
  // 3. Create second address - default
  const address2 =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          is_default: true,
        },
      },
    );
  typia.assert(address2);
  // 4. Create third address - non-default
  const address3 =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          is_default: false,
        },
      },
    );
  typia.assert(address3);
  // 5. Fetch page 1 with limit 2
  const page1 = await api.functional.eCommerceMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IECommerceMallCustomerAddress.IRequest,
    },
  );
  typia.assert(page1);
  // 6. Verify page 1 has 2 addresses with pagination metadata
  TestValidator.equals("page 1 address count", page1.data.length, 2);
  TestValidator.equals("pagination current", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, 2);
  TestValidator.equals("pagination records", page1.pagination.records, 3);
  TestValidator.equals("pagination pages", page1.pagination.pages, 2);
  // 7. Verify default address appears before non-default addresses
  TestValidator.predicate(
    "default address first on page 1",
    () => page1.data[0].isDefault === true,
  );
  TestValidator.predicate(
    "second address is non-default",
    () => page1.data[1].isDefault === false,
  );
  // 8. Fetch page 2 with limit 2
  const page2 = await api.functional.eCommerceMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies IECommerceMallCustomerAddress.IRequest,
    },
  );
  typia.assert(page2);
  // 9. Verify page 2 has 1 remaining address
  TestValidator.equals("page 2 address count", page2.data.length, 1);
  TestValidator.equals(
    "page 2 pagination current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 pagination limit", page2.pagination.limit, 2);
  TestValidator.equals(
    "page 2 pagination records",
    page2.pagination.records,
    3,
  );
  TestValidator.equals("page 2 pagination pages", page2.pagination.pages, 2);
  // 10. Verify remaining address is non-default
  TestValidator.predicate(
    "remaining address is non-default",
    () => page2.data[0].isDefault === false,
  );
  // 11. Verify every address summary contains all required fields
  const allAddresses: IECommerceMallCustomerAddress.ISummary[] = [
    ...page1.data,
    ...page2.data,
  ];
  for (const addr of allAddresses) {
    typia.assert<IECommerceMallCustomerAddress.ISummary>(addr);
  }
}
