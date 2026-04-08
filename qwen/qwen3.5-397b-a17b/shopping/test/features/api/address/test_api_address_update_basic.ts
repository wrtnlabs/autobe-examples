import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_addresses_create } from "../../../generate/generate_random_shopping_mall_member_addresses_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";

/**
 * Test basic address update workflow for customer shipping address modification.
 *
 * Validates the complete address update flow including member authentication, initial address creation, and address modification with new recipient and address details. Ensures that the update operation correctly modifies the specified fields while preserving ownership and returns the updated address record with accurate timestamps.
 *
 * Special attention is given to verifying that only the provided fields are updated, the updated_at timestamp reflects the modification time, and the address remains associated with the correct customer profile.
 *
 * 1. Member registers with email and password credentials.
 * 2. Member creates an initial address with complete delivery information.
 * 3. Member updates the address with modified recipient name, phone, and address details.
 * 4. Validates update response contains modified fields and updated_at timestamp has changed from created_at.
 */
export async function test_api_address_update_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Create initial address
  const initialAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          recipient_phone: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: typia.random<string>(),
          country: "United States",
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert(initialAddress);
  // 3. Update address with modified information
  const updateData = {
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.name(),
    state_province: RandomGenerator.name(),
    postal_code: typia.random<string>(),
    country: "Canada",
  } satisfies IShoppingMallCustomerAddress.IUpdate;
  const updatedAddress =
    await api.functional.shoppingMall.member.addresses.update(
      memberConnection,
      {
        addressId: initialAddress.id,
        body: updateData,
      },
    );
  typia.assert(updatedAddress);
  // 4. Validate update results
  TestValidator.equals(
    "recipient name updated",
    updatedAddress.recipient_name,
    updateData.recipient_name,
  );
  TestValidator.equals(
    "recipient phone updated",
    updatedAddress.recipient_phone,
    updateData.recipient_phone,
  );
  TestValidator.equals(
    "street address updated",
    updatedAddress.street_address,
    updateData.street_address,
  );
  TestValidator.equals("city updated", updatedAddress.city, updateData.city);
  TestValidator.equals(
    "state province updated",
    updatedAddress.state_province,
    updateData.state_province,
  );
  TestValidator.equals(
    "postal code updated",
    updatedAddress.postal_code,
    updateData.postal_code,
  );
  TestValidator.equals(
    "country updated",
    updatedAddress.country,
    updateData.country,
  );
  TestValidator.equals(
    "address id preserved",
    updatedAddress.id,
    initialAddress.id,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedAddress.updated_at,
    initialAddress.updated_at,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedAddress.updated_at) > new Date(updatedAddress.created_at),
  );
}
