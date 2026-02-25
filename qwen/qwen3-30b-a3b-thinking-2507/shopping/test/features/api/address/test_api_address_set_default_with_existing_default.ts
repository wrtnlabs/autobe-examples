import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_address_set_default_with_existing_default(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://example.com",
      referrer: "http://example.com",
    },
  });
  const existingAddress =
    await generate_random_ecommerce_customer_me_addresses_create(
      customerConnection,
      {},
    );
  await api.functional.ecommerce.customer.me.addresses._default.setDefault(
    customerConnection,
    {
      addressId: existingAddress.id,
    },
  );
  const newAddress =
    await generate_random_ecommerce_customer_me_addresses_create(
      customerConnection,
      {},
    );
  const updatedAddress =
    await api.functional.ecommerce.customer.me.addresses._default.setDefault(
      customerConnection,
      {
        addressId: newAddress.id,
      },
    );
  typia.assert(updatedAddress);
  TestValidator.equals(
    "is_default should be true for new default address",
    updatedAddress.is_default,
    true,
  );
}
