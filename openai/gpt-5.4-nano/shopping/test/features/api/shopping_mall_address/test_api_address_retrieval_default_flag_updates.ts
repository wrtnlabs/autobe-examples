import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
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
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

export async function test_api_address_retrieval_default_flag_updates(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const address1 = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: typia.random<string>(),
        country: RandomGenerator.name(1),
        city: RandomGenerator.name(1),
        street_line1: RandomGenerator.name(2),
        street_line2: null,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address1);
  const address2 = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: typia.random<string>(),
        country: RandomGenerator.name(1),
        city: RandomGenerator.name(1),
        street_line1: RandomGenerator.name(2),
        street_line2: null,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address2);
  await api.functional.shoppingMall.member.addresses._default.setDefaultAddress(
    memberConnection,
    {
      body: { id: address1.id } satisfies IShoppingMallAddress.ISetDefault,
    },
  );
  const got1AfterSet1 = await api.functional.shoppingMall.member.addresses.at(
    memberConnection,
    { addressId: address1.id },
  );
  typia.assert(got1AfterSet1);
  TestValidator.equals(
    "address1 is default after first set",
    got1AfterSet1.isDefault,
    true,
  );
  const got1AfterSet1Snapshot: IShoppingMallAddress = got1AfterSet1;
  await api.functional.shoppingMall.member.addresses._default.setDefaultAddress(
    memberConnection,
    {
      body: { id: address2.id } satisfies IShoppingMallAddress.ISetDefault,
    },
  );
  const got1AfterSet2 = await api.functional.shoppingMall.member.addresses.at(
    memberConnection,
    { addressId: address1.id },
  );
  typia.assert(got1AfterSet2);
  const got2AfterSet2 = await api.functional.shoppingMall.member.addresses.at(
    memberConnection,
    { addressId: address2.id },
  );
  typia.assert(got2AfterSet2);
  TestValidator.equals(
    "address1 is not default after switching",
    got1AfterSet2.isDefault,
    false,
  );
  TestValidator.equals(
    "address2 is default after switching",
    got2AfterSet2.isDefault,
    true,
  );
  // address1 non-default fields and timestamps should stay the same as stored for that record
  // (updatedAt may change when default flag flips, so compare to the snapshot after that change)
  TestValidator.equals(
    "address1 recipientName unchanged",
    got1AfterSet2.recipientName,
    got1AfterSet1Snapshot.recipientName,
  );
  TestValidator.equals(
    "address1 phoneNumber unchanged",
    got1AfterSet2.phoneNumber,
    got1AfterSet1Snapshot.phoneNumber,
  );
  TestValidator.equals(
    "address1 streetLine1 unchanged",
    got1AfterSet2.streetLine1,
    got1AfterSet1Snapshot.streetLine1,
  );
  TestValidator.equals(
    "address1 streetLine2 unchanged",
    got1AfterSet2.streetLine2,
    got1AfterSet1Snapshot.streetLine2,
  );
  TestValidator.equals(
    "address1 city unchanged",
    got1AfterSet2.city,
    got1AfterSet1Snapshot.city,
  );
  TestValidator.equals(
    "address1 postalCode unchanged",
    got1AfterSet2.postalCode,
    got1AfterSet1Snapshot.postalCode,
  );
  TestValidator.equals(
    "address1 country unchanged",
    got1AfterSet2.country,
    got1AfterSet1Snapshot.country,
  );
  TestValidator.equals(
    "address1 createdAt unchanged",
    got1AfterSet2.createdAt,
    got1AfterSet1Snapshot.createdAt,
  );
  // address2 non-default fields and timestamps should match its own stored values
  TestValidator.equals(
    "address2 recipientName unchanged",
    got2AfterSet2.recipientName,
    address2.recipientName,
  );
  TestValidator.equals(
    "address2 phoneNumber unchanged",
    got2AfterSet2.phoneNumber,
    address2.phoneNumber,
  );
  TestValidator.equals(
    "address2 streetLine1 unchanged",
    got2AfterSet2.streetLine1,
    address2.streetLine1,
  );
  TestValidator.equals(
    "address2 streetLine2 unchanged",
    got2AfterSet2.streetLine2,
    address2.streetLine2,
  );
  TestValidator.equals(
    "address2 city unchanged",
    got2AfterSet2.city,
    address2.city,
  );
  TestValidator.equals(
    "address2 postalCode unchanged",
    got2AfterSet2.postalCode,
    address2.postalCode,
  );
  TestValidator.equals(
    "address2 country unchanged",
    got2AfterSet2.country,
    address2.country,
  );
  TestValidator.equals(
    "address2 createdAt unchanged",
    got2AfterSet2.createdAt,
    address2.createdAt,
  );
}
