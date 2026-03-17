import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_shipping_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_shipping_addresses_create";
import { prepare_random_shopping_mall_shipping_address } from "../../../prepare/prepare_random_shopping_mall_shipping_address";

export async function test_api_shipping_address_update_deleted_address_rejected(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const createBody = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(8),
    country: RandomGenerator.name(1),
    is_default: false,
  } satisfies IShoppingMallShippingAddress.ICreate;
  const created: IShoppingMallShippingAddress =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerConnection,
      {
        body: createBody,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "created recipient name matches input",
    created.recipient_name,
    createBody.recipient_name,
  );
  TestValidator.equals(
    "created phone number matches input",
    created.phone_number,
    createBody.phone_number,
  );
  TestValidator.equals(
    "created street address matches input",
    created.street_address,
    createBody.street_address,
  );
  TestValidator.equals(
    "created city matches input",
    created.city,
    createBody.city,
  );
  TestValidator.equals(
    "created state matches input",
    created.state_province,
    createBody.state_province,
  );
  TestValidator.equals(
    "created postal code matches input",
    created.postal_code,
    createBody.postal_code,
  );
  TestValidator.equals(
    "created country matches input",
    created.country,
    createBody.country,
  );
  TestValidator.equals(
    "created default flag matches input",
    created.is_default,
    createBody.is_default ?? false,
  );
  await api.functional.shoppingMall.customer.shippingAddresses.erase(
    customerConnection,
    {
      addressId: created.id,
    },
  );
  const updateBody = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 4 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(10),
    country: RandomGenerator.name(1),
    is_default: true,
  } satisfies IShoppingMallShippingAddress.IUpdate;
  TestValidator.notEquals(
    "update recipient differs from last valid state",
    updateBody.recipient_name,
    created.recipient_name,
  );
  TestValidator.notEquals(
    "update street differs from last valid state",
    updateBody.street_address,
    created.street_address,
  );
  await TestValidator.error(
    "updating deleted shipping address is rejected",
    async () => {
      await api.functional.shoppingMall.customer.shippingAddresses.update(
        customerConnection,
        {
          addressId: created.id,
          body: updateBody,
        },
      );
    },
  );
  await TestValidator.error(
    "deleted shipping address remains unavailable after rejected update",
    async () => {
      await api.functional.shoppingMall.customer.shippingAddresses.update(
        customerConnection,
        {
          addressId: created.id,
          body: updateBody,
        },
      );
    },
  );
}
