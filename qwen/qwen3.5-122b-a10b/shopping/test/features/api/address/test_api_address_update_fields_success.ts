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

export async function test_api_address_update_fields_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
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
  // 2. Create initial address
  const originalAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          postal_code: typia.random<string & tags.MinLength<1> & tags.MaxLength<10>>(),
          country: RandomGenerator.name(1),
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(originalAddress);
  // Store original timestamps
  const originalCreatedAt = originalAddress.createdAt;
  const originalUpdatedAt = originalAddress.updatedAt;
  // 3. Update address with new values
  const updateBody = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(1),
    stateProvince: RandomGenerator.name(1),
    postalCode: typia.random<string & tags.MinLength<1> & tags.MaxLength<10>>(),
    country: RandomGenerator.name(1),
  } satisfies IEcommerceMallAddress.IUpdate;
  const updatedAddress =
    await api.functional.ecommerceMall.customer.addresses.update(
      customerConnection,
      {
        addressId: originalAddress.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAddress);
  // 4. Verify response contains updated values
  TestValidator.equals(
    "recipient name updated",
    updatedAddress.recipientName,
    updateBody.recipientName,
  );
  TestValidator.equals(
    "phone number updated",
    updatedAddress.phoneNumber,
    updateBody.phoneNumber,
  );
  TestValidator.equals(
    "street address updated",
    updatedAddress.streetAddress,
    updateBody.streetAddress,
  );
  TestValidator.equals("city updated", updatedAddress.city, updateBody.city);
  TestValidator.equals(
    "state province updated",
    updatedAddress.stateProvince,
    updateBody.stateProvince,
  );
  TestValidator.equals(
    "postal code updated",
    updatedAddress.postalCode,
    updateBody.postalCode,
  );
  TestValidator.equals(
    "country updated",
    updatedAddress.country,
    updateBody.country,
  );
  // 5. Verify timestamps
  TestValidator.predicate(
    "created_at unchanged",
    updatedAddress.createdAt === originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at newer than created_at",
    updatedAddress.updatedAt > updatedAddress.createdAt,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedAddress.updatedAt !== originalUpdatedAt,
  );
  // 6. Verify customer ownership
  TestValidator.equals(
    "customer ID matches",
    updatedAddress.customer.id,
    customer.id,
  );
}