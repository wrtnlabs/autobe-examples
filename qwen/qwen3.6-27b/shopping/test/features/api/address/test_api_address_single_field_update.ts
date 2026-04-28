import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

export async function test_api_address_single_field_update(
  connection: api.IConnection,
) {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: {} });
  const addressCreated =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      { body: {} },
    );
  typia.assert(addressCreated);
  const newPhoneNumber = RandomGenerator.mobile();
  const body = {
    phoneNumber: newPhoneNumber,
  } satisfies IEcommercePlatformShippingAddress.IUpdate;
  const addressUpdated =
    await api.functional.ecommercePlatform.customer.addresses.update(
      customerConnection,
      {
        addressId: addressCreated.id,
        body,
      },
    );
  typia.assert(addressUpdated);
  TestValidator.equals(
    "phoneNumber was updated",
    addressUpdated.phone_number,
    newPhoneNumber,
  );
  TestValidator.equals(
    "recipient_name unchanged",
    addressUpdated.recipient_name,
    addressCreated.recipient_name,
  );
  TestValidator.equals(
    "street_address unchanged",
    addressUpdated.street_address,
    addressCreated.street_address,
  );
  TestValidator.equals(
    "city unchanged",
    addressUpdated.city,
    addressCreated.city,
  );
  TestValidator.equals(
    "state unchanged",
    addressUpdated.state,
    addressCreated.state,
  );
  TestValidator.equals(
    "postal_code unchanged",
    addressUpdated.postal_code,
    addressCreated.postal_code,
  );
  TestValidator.equals(
    "country unchanged",
    addressUpdated.country,
    addressCreated.country,
  );
  TestValidator.equals(
    "is_default unchanged",
    addressUpdated.is_default,
    addressCreated.is_default,
  );
  TestValidator.notEquals(
    "updated_at changed",
    addressUpdated.updated_at,
    addressCreated.updated_at,
  );
}
