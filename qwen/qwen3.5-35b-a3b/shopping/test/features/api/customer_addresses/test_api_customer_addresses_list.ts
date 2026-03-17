import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";

export async function test_api_customer_addresses_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the platform
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "http://example.com/join",
      referrer: "http://example.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create 3 shipping addresses
  const address1 =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          recipient_phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(2),
          state: RandomGenerator.name(1),
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(address1);
  const address2 =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          recipient_phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(2),
          state: RandomGenerator.name(1),
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(address2);
  const address3 =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          recipient_phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(2),
          state: RandomGenerator.name(1),
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(address3);
  // 3. Set one address as default
  const updatedAddress =
    await api.functional.ecommerceMall.customer.addresses._default.setDefault(
      customerConnection,
      {
        addressId: address3.id,
      },
    );
  typia.assert(updatedAddress);
  TestValidator.equals(
    "default address is_default",
    updatedAddress.is_default,
    true,
  );
  // 4. Retrieve address list
  const page = await api.functional.ecommerceMall.customer.addresses.index(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(page);
  // Validate response structure
  TestValidator.equals("pagination records count", page.pagination.records, 3);
  TestValidator.equals("pagination pages count", page.pagination.pages, 1);
  TestValidator.equals("data length", page.data.length, 3);
  // Validate is_default flags are correct
  let foundDefault = false;
  for (const address of page.data) {
    if (address.id === address3.id) {
      TestValidator.equals("address3 is_default", address.is_default, true);
      foundDefault = true;
    } else {
      TestValidator.equals(
        "other addresses not default",
        address.is_default,
        false,
      );
    }
  }
  TestValidator.predicate("exactly one default address", foundDefault === true);
  // Verify all addresses belong to the authenticated customer (using create responses)
  TestValidator.equals(
    "address1 belongs to customer",
    address1.ecommerce_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "address2 belongs to customer",
    address2.ecommerce_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "address3 belongs to customer",
    address3.ecommerce_mall_customer_id,
    customer.id,
  );
  // Verify sorting (newest first by created_at)
  for (let i = 1; i < page.data.length; i++) {
    const prevCreatedAt = new Date(page.data[i - 1].created_at).getTime();
    const currCreatedAt = new Date(page.data[i].created_at).getTime();
    TestValidator.predicate(
      "addresses sorted by created_at descending",
      prevCreatedAt >= currCreatedAt,
    );
  }
  // Verify soft-deleted addresses are not included
  for (const address of page.data) {
    TestValidator.predicate(
      "address not soft-deleted",
      address.deleted_at === null,
    );
  }
}
