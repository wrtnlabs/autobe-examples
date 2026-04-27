import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";

export async function test_api_customer_addresses_admin_filter_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Create customer connection and account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. Create first address (auto-default as it's the first address)
  const address1 =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address1);
  TestValidator.equals("first address is default", address1.is_default, true);
  // 4. Create second address (explicitly non-default)
  const address2 =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          is_default: false,
        } satisfies DeepPartial<IECommerceMallCustomerAddress.ICreate>,
      },
    );
  typia.assert(address2);
  TestValidator.equals(
    "second address is not default",
    address2.is_default,
    false,
  );
  // 5. As administrator, filter by isDefault=true
  const defaultAddresses =
    await api.functional.eCommerceMall.administrator.customers.addresses.index(
      adminConnection,
      {
        customerId: customer.id,
        body: {
          isDefault: true,
        } satisfies IECommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(defaultAddresses);
  TestValidator.equals(
    "only default address returned",
    defaultAddresses.data.length,
    1,
  );
  TestValidator.equals(
    "returned address is default",
    defaultAddresses.data[0]!.isDefault,
    true,
  );
  TestValidator.equals(
    "default address id matches",
    defaultAddresses.data[0]!.id,
    address1.id,
  );
  // 6. As administrator, filter by isDefault=false
  const nonDefaultAddresses =
    await api.functional.eCommerceMall.administrator.customers.addresses.index(
      adminConnection,
      {
        customerId: customer.id,
        body: {
          isDefault: false,
        } satisfies IECommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(nonDefaultAddresses);
  TestValidator.equals(
    "only non-default address returned",
    nonDefaultAddresses.data.length,
    1,
  );
  TestValidator.equals(
    "returned address is not default",
    nonDefaultAddresses.data[0]!.isDefault,
    false,
  );
  TestValidator.equals(
    "non-default address id matches",
    nonDefaultAddresses.data[0]!.id,
    address2.id,
  );
}
