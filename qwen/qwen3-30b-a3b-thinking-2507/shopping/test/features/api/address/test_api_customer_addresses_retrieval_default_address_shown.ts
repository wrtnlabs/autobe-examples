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
import { generate_random_ecommerce_customer_me_addresses_create } from "../../../generate/generate_random_ecommerce_customer_me_addresses_create";
import { prepare_random_ecommerce_customer_address } from "../../../prepare/prepare_random_ecommerce_customer_address";

export async function test_api_customer_addresses_retrieval_default_address_shown(
  connection: api.IConnection,
) {
  // Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://test.com",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // Generate a random address
  const address = await generate_random_ecommerce_customer_me_addresses_create(
    customerConnection,
    {},
  );
  // Set the address as default
  await api.functional.ecommerce.customer.me.addresses._default.setDefault(
    customerConnection,
    {
      addressId: address.id,
    },
  );
  // Retrieve addresses
  const result = await api.functional.ecommerce.customer.addresses.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceCustomerAddress.IRequest,
    },
  );
  typia.assert(result);
  // Verify default address is included with is_default=true
  const defaultAddress = result.data.find((addr) => addr.id === address.id);
  TestValidator.predicate(
    "default address found",
    defaultAddress !== undefined,
  );
  TestValidator.equals("is_default true", defaultAddress?.is_default, true);
}
