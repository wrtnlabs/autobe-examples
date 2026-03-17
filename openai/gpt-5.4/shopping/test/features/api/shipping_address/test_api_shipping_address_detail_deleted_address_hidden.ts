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

export async function test_api_shipping_address_detail_deleted_address_hidden(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  const createdBody = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(8),
    country: RandomGenerator.name(1),
    is_default: true,
  } satisfies IShoppingMallShippingAddress.ICreate;
  const created =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerConnection,
      {
        body: createdBody,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "recipient name matches created input",
    created.recipient_name,
    createdBody.recipient_name,
  );
  TestValidator.equals(
    "phone number matches created input",
    created.phone_number,
    createdBody.phone_number,
  );
  TestValidator.equals(
    "street address matches created input",
    created.street_address,
    createdBody.street_address,
  );
  TestValidator.equals(
    "city matches created input",
    created.city,
    createdBody.city,
  );
  TestValidator.equals(
    "state/province matches created input",
    created.state_province,
    createdBody.state_province,
  );
  TestValidator.equals(
    "postal code matches created input",
    created.postal_code,
    createdBody.postal_code,
  );
  TestValidator.equals(
    "country matches created input",
    created.country,
    createdBody.country,
  );
  TestValidator.equals(
    "created address is default before deletion",
    created.is_default,
    true,
  );
  await api.functional.shoppingMall.customer.shippingAddresses.erase(
    customerConnection,
    {
      addressId: created.id,
    },
  );
  await TestValidator.httpError(
    "deleted shipping address detail is hidden from customer retrieval",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.customer.shippingAddresses.at(
        customerConnection,
        {
          addressId: created.id,
        },
      );
    },
  );
}
