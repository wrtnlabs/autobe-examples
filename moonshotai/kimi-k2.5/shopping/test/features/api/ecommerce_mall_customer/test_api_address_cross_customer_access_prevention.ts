import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer } from "../../../prepare/prepare_random_ecommerce_mall_customer";

/**
 * Test security boundary enforcement preventing cross-customer address access on the address list endpoint.
 *
 * This test verifies that PATCH /ecommerceMall/customer/addresses returns ONLY addresses
 * owned by the authenticated customer, ensuring proper data isolation between customers.
 */
export async function test_api_address_cross_customer_access_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Customer A and authenticate
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerA);

  // 2. Create 3 addresses for Customer A
  const customerAAddresses: IEcommerceMallCustomer[] =
    await ArrayUtil.asyncRepeat(3, async () =>
      generate_random_ecommerce_mall_customer_addresses_create(
        customerAConnection,
        {},
      ),
    );
  customerAAddresses.forEach((addr) => typia.assert(addr));
  const customerAAddressIds = new Set(customerAAddresses.map((a) => a.id));

  // 3. Create Customer B and authenticate (separate connection)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerB);

  // 4. Create 2 addresses for Customer B
  const customerBAddresses: IEcommerceMallCustomer[] =
    await ArrayUtil.asyncRepeat(2, async () =>
      generate_random_ecommerce_mall_customer_addresses_create(
        customerBConnection,
        {},
      ),
    );
  customerBAddresses.forEach((addr) => typia.assert(addr));
  const customerBAddressIds = new Set(customerBAddresses.map((a) => a.id));

  // 5. List addresses as Customer A
  const listAResponse =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerAConnection,
      {
        body: {} satisfies IEcommerceMallCustomer.IRequest,
      },
    );
  typia.assert(listAResponse);

  // 6. Verify Customer A sees exactly 3 addresses
  TestValidator.equals(
    "Customer A should see exactly 3 addresses",
    listAResponse.data.length,
    3,
  );

  // 7. Verify pagination metadata for Customer A
  TestValidator.equals(
    "Customer A pagination records should be 3",
    listAResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "Customer A pagination pages should be calculated correctly",
    listAResponse.pagination.pages,
    1,
  );

  // 8. Verify none of Customer B's address IDs appear in Customer A's response
  const addressesA = typia.assert<IEcommerceMallCustomer[]>(listAResponse.data);
  for (const address of addressesA) {
    TestValidator.predicate(
      `Address ${address.id} should not be from Customer B`,
      !customerBAddressIds.has(address.id),
    );
  }

  // 9. Apply filters and verify still scoped to Customer A only
  // Filter by isDefault
  const defaultFilterResponse =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerAConnection,
      {
        body: {
          isDefault: true,
        } satisfies IEcommerceMallCustomer.IRequest,
      },
    );
  typia.assert(defaultFilterResponse);
  TestValidator.predicate(
    "Default filter should return subset of Customer A's addresses",
    defaultFilterResponse.pagination.records <= 3,
  );

  // Filter by city using one of Customer A's cities
  const sampleCity = customerAAddresses[0]?.city;
  if (sampleCity) {
    const cityFilterResponse =
      await api.functional.ecommerceMall.customer.addresses.index(
        customerAConnection,
        {
          body: {
            city: sampleCity,
          } satisfies IEcommerceMallCustomer.IRequest,
        },
      );
    typia.assert(cityFilterResponse);
    const filteredAddresses = typia.assert<IEcommerceMallCustomer[]>(cityFilterResponse.data);
    TestValidator.predicate(
      "City filter should return addresses from Customer A only",
      filteredAddresses.every((addr) => customerAAddressIds.has(addr.id)),
    );
  }

  // 10. Verify Customer B's list contains only their 2 addresses
  const listBResponse =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerBConnection,
      {
        body: {} satisfies IEcommerceMallCustomer.IRequest,
      },
    );
  typia.assert(listBResponse);

  TestValidator.equals(
    "Customer B should see exactly 2 addresses",
    listBResponse.data.length,
    2,
  );
  TestValidator.equals(
    "Customer B pagination records should be 2",
    listBResponse.pagination.records,
    2,
  );

  // Verify Customer B doesn't see Customer A's addresses
  const addressesB = typia.assert<IEcommerceMallCustomer[]>(listBResponse.data);
  for (const address of addressesB) {
    TestValidator.predicate(
      `Address ${address.id} should not be from Customer A`,
      !customerAAddressIds.has(address.id),
    );
  }
}