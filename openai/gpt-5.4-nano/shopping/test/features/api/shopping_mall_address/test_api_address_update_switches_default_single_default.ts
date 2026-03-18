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
import { generate_random_shopping_mall_member_addresses_update_addresses } from "../../../generate/generate_random_shopping_mall_member_addresses_update_addresses";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

export async function test_api_address_update_switches_default_single_default(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
  };
  memberAuthConnection.headers = {
    ...(memberAuthConnection.headers ?? {}),
    Authorization: member.token.access,
  };

  const addressA = await generate_random_shopping_mall_member_addresses_create(
    memberAuthConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: RandomGenerator.alphabets(6),
        country: "Korea",
        city: RandomGenerator.name(2),
        street_line1: RandomGenerator.alphabets(10),
        street_line2: RandomGenerator.alphabets(8),
        is_default: true,
      },
    },
  );
  typia.assert(addressA);

  const addressB = await generate_random_shopping_mall_member_addresses_create(
    memberAuthConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: RandomGenerator.alphabets(6),
        country: "Korea",
        city: RandomGenerator.name(2),
        street_line1: RandomGenerator.alphabets(10),
        street_line2: null,
        is_default: false,
      },
    },
  );
  typia.assert(addressB);

  const patched =
    await generate_random_shopping_mall_member_addresses_update_addresses(
      memberAuthConnection,
      {
        body: {
          // 'id' is not accepted by the generated update payload type.
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_line1: RandomGenerator.alphabets(12),
          street_line2: RandomGenerator.alphabets(8),
          city: RandomGenerator.name(2),
          postal_code: RandomGenerator.alphabets(6),
          country: "Korea",
          is_default: true,
        } satisfies Record<string, unknown> as any,
      },
    );
  typia.assert(patched);

  const updatedRecipientName = patched.recipientName;
  const updatedPhoneNumber = patched.phoneNumber;
  const updatedStreetLine1 = patched.streetLine1;
  const updatedStreetLine2 = patched.streetLine2;
  const updatedCity = patched.city;
  const updatedPostalCode = patched.postalCode;
  const updatedCountry = patched.country;

  TestValidator.equals("patched address id", patched.id, addressB.id);
  TestValidator.equals("patched address isDefault", patched.isDefault, true);
  TestValidator.equals(
    "patched recipientName",
    patched.recipientName,
    updatedRecipientName,
  );
  TestValidator.equals(
    "patched phoneNumber",
    patched.phoneNumber,
    updatedPhoneNumber,
  );
  TestValidator.equals(
    "patched streetLine1",
    patched.streetLine1,
    updatedStreetLine1,
  );
  TestValidator.equals(
    "patched streetLine2",
    patched.streetLine2,
    updatedStreetLine2,
  );
  TestValidator.equals("patched city", patched.city, updatedCity);
  TestValidator.equals(
    "patched postalCode",
    patched.postalCode,
    updatedPostalCode,
  );
  TestValidator.equals("patched country", patched.country, updatedCountry);

  const defaultAddress = await (api.functional.shoppingMall.member.addresses as any)
    .getDefault(memberAuthConnection);
  typia.assert(defaultAddress);

  TestValidator.equals(
    "default switched to patched address",
    defaultAddress.id,
    addressB.id,
  );
  TestValidator.equals(
    "defaultAddress.isDefault",
    defaultAddress.isDefault,
    true,
  );

  const addressAAfter = await (api.functional.shoppingMall.member.addresses as any)
    .get(memberAuthConnection, {
      path: { id: addressA.id },
    });
  typia.assert(addressAAfter);
  TestValidator.equals(
    "addressA is no longer default",
    addressAAfter.isDefault,
    false,
  );

  const allActive = await (api.functional.shoppingMall.member.addresses as any)
    .list(memberAuthConnection, {});
  typia.assert(allActive);

  type AddressItem = (typeof allActive)[number];
  const defaults = allActive.filter((x: AddressItem) => x.isDefault);

  TestValidator.equals("exactly one default", defaults.length, 1);
  TestValidator.equals("default id is addressB", defaults[0].id, addressB.id);
}
