import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_member_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_member_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";

export async function test_api_address_update_partial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IEcommerceMallMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(memberAuth);
  const memberId: string = memberAuth.id;
  // 2. Create initial address with all fields
  const initialAddress: IEcommerceMallCustomerAddress =
    await generate_random_ecommerce_mall_member_customer_addresses_create(
      memberConnection,
      {
        body: {
          recipient_name: "John Doe",
          phone: "010-1234-5678",
          street: "123 Main St",
          city: "Seoul",
          state: "Gyeonggi-do",
          postal_code: "06292",
          country: "South Korea",
          is_default: true,
        },
      },
    );
  typia.assert(initialAddress);
  const createdAddressId: string = initialAddress.id;
  const createdAt: string = initialAddress.created_at;
  // 3. Update only recipient_name and phone
  const updatedAddress: IEcommerceMallCustomerAddress =
    await api.functional.ecommerceMall.member.addresses.update(
      memberConnection,
      {
        addressId: createdAddressId,
        body: {
          recipient_name: "Jane Smith",
          phone: "010-9876-5432",
        },
      },
    );
  typia.assert(updatedAddress);
  // 4. Validate updated fields
  TestValidator.equals(
    "recipient_name updated",
    updatedAddress.recipient_name,
    "Jane Smith",
  );
  TestValidator.equals("phone updated", updatedAddress.phone, "010-9876-5432");
  // 5. Validate unchanged fields retained original values
  TestValidator.equals(
    "street unchanged",
    updatedAddress.street,
    "123 Main St",
  );
  TestValidator.equals("city unchanged", updatedAddress.city, "Seoul");
  TestValidator.equals("state unchanged", updatedAddress.state, "Gyeonggi-do");
  TestValidator.equals(
    "postal_code unchanged",
    updatedAddress.postal_code,
    "06292",
  );
  TestValidator.equals(
    "country unchanged",
    updatedAddress.country,
    "South Korea",
  );
  // 6. Validate is_default preserved
  TestValidator.equals("is_default preserved", updatedAddress.is_default, true);
  // 7. Validate updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at changed",
    createdAt,
    updatedAddress.updated_at,
  );
  // 8. Validate address ID unchanged
  TestValidator.equals(
    "address ID unchanged",
    updatedAddress.id,
    createdAddressId,
  );
  // 9. Validate customer belongs to authenticated member
  TestValidator.equals(
    "customer ID matches authenticated member",
    updatedAddress.customer.id,
    memberId,
  );
}
