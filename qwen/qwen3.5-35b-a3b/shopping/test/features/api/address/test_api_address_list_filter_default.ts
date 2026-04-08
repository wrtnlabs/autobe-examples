import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_member_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_member_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";

export async function test_api_address_list_filter_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const authConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(authConnection, {
    body: typia.random<IEcommerceMallMember.IJoin>(),
  });
  typia.assert(authResponse);
  // 2. Create member-specific connection for authenticated requests
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = authResponse.token.access;
  // 3. Create first address as default (is_default=true)
  const defaultAddress =
    await generate_random_ecommerce_mall_member_customer_addresses_create(
      memberConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: typia.random<string & tags.MaxLength<200>>(),
          city: typia.random<string & tags.MaxLength<100>>(),
          state: typia.random<string & tags.MaxLength<100>>(),
          postal_code: typia.random<string & tags.MaxLength<20>>(),
          country: typia.random<string & tags.MaxLength<50>>(),
          is_default: true,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(defaultAddress);
  // 4. Create second address as non-default (is_default=false)
  const nonDefaultAddress =
    await generate_random_ecommerce_mall_member_customer_addresses_create(
      memberConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: typia.random<string & tags.MaxLength<200>>(),
          city: typia.random<string & tags.MaxLength<100>>(),
          state: typia.random<string & tags.MaxLength<100>>(),
          postal_code: typia.random<string & tags.MaxLength<20>>(),
          country: typia.random<string & tags.MaxLength<50>>(),
          is_default: false,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(nonDefaultAddress);
  // 5. Create third address as non-default (is_default=false)
  const anotherNonDefaultAddress =
    await generate_random_ecommerce_mall_member_customer_addresses_create(
      memberConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: typia.random<string & tags.MaxLength<200>>(),
          city: typia.random<string & tags.MaxLength<100>>(),
          state: typia.random<string & tags.MaxLength<100>>(),
          postal_code: typia.random<string & tags.MaxLength<20>>(),
          country: typia.random<string & tags.MaxLength<50>>(),
          is_default: false,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(anotherNonDefaultAddress);
  // 6. Test is_default=true filter - should return exactly one address
  const defaultFilterResult =
    await api.functional.ecommerceMall.member.addresses.index(
      memberConnection,
      {
        body: {
          is_default: true,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(defaultFilterResult);
  TestValidator.equals(
    "default filter returns one address",
    defaultFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "default address is marked as default",
    defaultFilterResult.data[0].is_default,
    true,
  );
  // 7. Test is_default=false filter - should return all non-default addresses
  const nonDefaultFilterResult =
    await api.functional.ecommerceMall.member.addresses.index(
      memberConnection,
      {
        body: {
          is_default: false,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(nonDefaultFilterResult);
  TestValidator.equals(
    "non-default filter returns two addresses",
    nonDefaultFilterResult.data.length,
    2,
  );
  for (const addr of nonDefaultFilterResult.data) {
    TestValidator.equals(
      "non-default address is marked as not default",
      addr.is_default,
      false,
    );
  }
  // 8. Test no filter - should return all addresses (default + non-default)
  const allFilterResult =
    await api.functional.ecommerceMall.member.addresses.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(allFilterResult);
  TestValidator.equals(
    "no filter returns all addresses",
    allFilterResult.data.length,
    3,
  );
  TestValidator.equals(
    "total records matches data count",
    allFilterResult.pagination.records,
    3,
  );
  TestValidator.equals("total pages is 1", allFilterResult.pagination.pages, 1);
  // 9. Verify pagination metadata consistency
  const expectedRecords =
    defaultFilterResult.data.length + nonDefaultFilterResult.data.length;
  TestValidator.equals(
    "sum of filtered results equals total",
    expectedRecords,
    allFilterResult.data.length,
  );
  // 10. Verify default address ID is present in unfiltered results
  const defaultAddressId = defaultFilterResult.data[0].id;
  const foundInAll = allFilterResult.data.some(
    (addr) => addr.id === defaultAddressId,
  );
  TestValidator.predicate(
    "default address found in unfiltered list",
    foundInAll,
  );
  // 11. Verify both non-default addresses are present in unfiltered results
  const nonDefaultAddressIds = new Set([
    nonDefaultFilterResult.data[0].id,
    nonDefaultFilterResult.data[1].id,
  ]);
  const foundNonDefault1 = allFilterResult.data.some(
    (addr) => addr.id === nonDefaultFilterResult.data[0].id,
  );
  const foundNonDefault2 = allFilterResult.data.some(
    (addr) => addr.id === nonDefaultFilterResult.data[1].id,
  );
  TestValidator.predicate(
    "non-default address 1 found in unfiltered list",
    foundNonDefault1,
  );
  TestValidator.predicate(
    "non-default address 2 found in unfiltered list",
    foundNonDefault2,
  );
}
