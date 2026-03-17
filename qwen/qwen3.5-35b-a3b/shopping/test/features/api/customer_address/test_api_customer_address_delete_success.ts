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

export async function test_api_customer_address_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create Address A (first address, will be default)
  const addressA =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          recipient_phone: RandomGenerator.mobile(),
          street: typia.random<string & tags.MinLength<1>>(),
          city: RandomGenerator.name(),
          state: RandomGenerator.name(),
        },
      },
    );
  typia.assert(addressA);
  const addressAId: string & tags.Format<"uuid"> = addressA.id;
  TestValidator.equals(
    "Address A should be default",
    addressA.is_default,
    true,
  );
  // 3. Create Address B (A remains default)
  const addressB =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          recipient_phone: RandomGenerator.mobile(),
          street: typia.random<string & tags.MinLength<1>>(),
          city: RandomGenerator.name(),
          state: RandomGenerator.name(),
        },
      },
    );
  typia.assert(addressB);
  const addressBId: string & tags.Format<"uuid"> = addressB.id;
  TestValidator.equals(
    "Address B should NOT be default",
    addressB.is_default,
    false,
  );
  // 4. Set Address A as default (explicitly)
  const addressASetDefault =
    await api.functional.ecommerceMall.customer.addresses._default.setDefault(
      customerConnection,
      {
        addressId: addressAId,
      },
    );
  typia.assert(addressASetDefault);
  TestValidator.equals(
    "Address A is default after setDefault",
    addressASetDefault.is_default,
    true,
  );
  // 5. Create Address C (A remains default)
  const addressC =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          recipient_phone: RandomGenerator.mobile(),
          street: typia.random<string & tags.MinLength<1>>(),
          city: RandomGenerator.name(),
          state: RandomGenerator.name(),
        },
      },
    );
  typia.assert(addressC);
  const addressCId: string & tags.Format<"uuid"> = addressC.id;
  TestValidator.equals(
    "Address C should NOT be default",
    addressC.is_default,
    false,
  );
  // 6. Set Address C as new default (A becomes non-default)
  const addressCSetDefault =
    await api.functional.ecommerceMall.customer.addresses._default.setDefault(
      customerConnection,
      {
        addressId: addressCId,
      },
    );
  typia.assert(addressCSetDefault);
  TestValidator.equals(
    "Address C is default after setDefault",
    addressCSetDefault.is_default,
    true,
  );
  // 7. Delete Address A (non-default address)
  await api.functional.ecommerceMall.customer.addresses.erase(
    customerConnection,
    {
      addressId: addressAId,
    },
  );
  // 8. Verify Address B and C are still accessible
  const addressBCheck =
    await api.functional.ecommerceMall.customer.addresses._default.setDefault(
      customerConnection,
      {
        addressId: addressBId,
      },
    );
  typia.assert(addressBCheck);
  TestValidator.equals(
    "Address B still accessible",
    addressBCheck.id,
    addressBId,
  );
  TestValidator.predicate(
    "Address B not deleted",
    addressBCheck.deleted_at === null,
  );
  const addressCCheck =
    await api.functional.ecommerceMall.customer.addresses._default.setDefault(
      customerConnection,
      {
        addressId: addressCId,
      },
    );
  typia.assert(addressCCheck);
  TestValidator.equals(
    "Address C still accessible",
    addressCCheck.id,
    addressCId,
  );
  TestValidator.equals(
    "Address C still default",
    addressCCheck.is_default,
    true,
  );
  // 9. Verify customer can continue using service (create another address)
  const addressD =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          recipient_phone: RandomGenerator.mobile(),
          street: typia.random<string & tags.MinLength<1>>(),
          city: RandomGenerator.name(),
          state: RandomGenerator.name(),
        },
      },
    );
  typia.assert(addressD);
  TestValidator.equals(
    "Address D created successfully",
    addressD.ecommerce_mall_customer_id,
    customer.id,
  );
  // All validations passed
  TestValidator.predicate("Address A deleted successfully", true);
}
