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

export async function test_api_customer_address_update_default_flag(
  connection: api.IConnection,
) {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost",
      referrer: "http://localhost",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const createdAddress =
    await generate_random_ecommerce_customer_me_addresses_create(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(createdAddress);
  const updatedAddress =
    await api.functional.ecommerce.customer.addresses.update(
      customerConnection,
      {
        addressId: createdAddress.id,
        body: { is_default: true } satisfies IEcommerceCustomerAddress.IUpdate,
      },
    );
  typia.assert(updatedAddress);
  TestValidator.predicate(
    "address should be default",
    updatedAddress.is_default,
  );
  TestValidator.equals(
    "recipient_name unchanged",
    updatedAddress.recipient_name,
    createdAddress.recipient_name,
  );
  TestValidator.equals(
    "phone unchanged",
    updatedAddress.phone,
    createdAddress.phone,
  );
  TestValidator.equals(
    "street_address unchanged",
    updatedAddress.street_address,
    createdAddress.street_address,
  );
  TestValidator.equals(
    "city unchanged",
    updatedAddress.city,
    createdAddress.city,
  );
  TestValidator.equals(
    "state unchanged",
    updatedAddress.state,
    createdAddress.state,
  );
  TestValidator.equals(
    "postal_code unchanged",
    updatedAddress.postal_code,
    createdAddress.postal_code,
  );
  TestValidator.equals(
    "country unchanged",
    updatedAddress.country,
    createdAddress.country,
  );
}
