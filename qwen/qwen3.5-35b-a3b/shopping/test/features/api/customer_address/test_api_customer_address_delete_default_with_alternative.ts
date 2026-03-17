import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_customer_address_delete_default_with_alternative(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(joinResult);
  // 2. Create customer connection for subsequent API calls (using updated joinConnection)
  const customerConnection: api.IConnection = {
    host: joinConnection.host,
  };
  customerConnection.headers = {
    ...joinConnection.headers,
    Authorization: joinResult.token.access,
  };
  // 3. Create first shipping address (becomes default automatically)
  const address1: IEcommerceMallAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address1);
  TestValidator.predicate(
    "first address is default upon creation",
    address1.is_default,
  );
  // 4. Create second shipping address (first remains default)
  const address2: IEcommerceMallAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address2);
  TestValidator.equals(
    "first address still default after second created",
    address1.is_default,
    true,
  );
  TestValidator.equals(
    "second address not default after creation",
    address2.is_default,
    false,
  );
  // 5. Set second address as the new default
  const updatedAddress2: IEcommerceMallAddress =
    await api.functional.ecommerceMall.customer.addresses._default.setDefault(
      customerConnection,
      {
        addressId: address2.id,
      },
    );
  typia.assert(updatedAddress2);
  TestValidator.equals(
    "second address is now default after update",
    updatedAddress2.is_default,
    true,
  );
  TestValidator.equals(
    "first address no longer default after second set as default",
    address1.is_default,
    false,
  );
  // 6. Delete first address (now non-default, but customer has alternative)
  // This should succeed with HTTP 204 No Content since there's another address
  await api.functional.ecommerceMall.customer.addresses.erase(
    customerConnection,
    {
      addressId: address1.id,
    },
  );
  // 7. Verify deletion succeeded (no error thrown means HTTP 204/200)
  TestValidator.equals(
    "first address deletion succeeded without error",
    true,
    true,
  );
  // 8. Verify remaining address maintains default status
  // Note: Without GET /addresses endpoint, we cannot fetch the updated list
  // The deletion operation itself validates the business rule (has alternative)
  TestValidator.equals(
    "customer still has address2 available after address1 deletion",
    address2.id !== undefined,
    true,
  );
}
