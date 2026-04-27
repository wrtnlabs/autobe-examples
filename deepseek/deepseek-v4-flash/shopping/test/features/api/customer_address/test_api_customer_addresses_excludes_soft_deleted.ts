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

export async function test_api_customer_addresses_excludes_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Create two addresses: first non-default, second as default
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
  // 3. List all addresses — should contain both
  const page1 = await api.functional.eCommerceMall.customer.addresses.index(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "both addresses appear in listing",
    2,
    page1.data.length,
  );
  // 4. Delete the first address (soft-delete)
  await api.functional.eCommerceMall.customer.addresses.erase(
    customerConnection,
    {
      addressId: address1.id,
    },
  );
  // 5. List addresses again — should contain only the second (default) address
  const page2 = await api.functional.eCommerceMall.customer.addresses.index(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "only one address remains after deletion",
    1,
    page2.data.length,
  );
  TestValidator.equals(
    "remaining address is the default one",
    page2.data[0].id,
    address2.id,
  );
  TestValidator.predicate(
    "deleted address is excluded from listing",
    page2.data.every((addr) => addr.id !== address1.id),
  );
}
