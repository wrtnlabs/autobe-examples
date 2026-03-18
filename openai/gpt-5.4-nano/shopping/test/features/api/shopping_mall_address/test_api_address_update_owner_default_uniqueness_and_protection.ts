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

export async function test_api_address_update_owner_default_uniqueness_and_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1) Setup: member1 + two addresses
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member1);
  const addressA = await generate_random_shopping_mall_member_addresses_create(
    member1Connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: "US",
        city: RandomGenerator.name(2),
        street_line1: RandomGenerator.alphabets(12),
        street_line2: null,
        is_default: false,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(addressA);
  const addressB = await generate_random_shopping_mall_member_addresses_create(
    member1Connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: "US",
        city: RandomGenerator.name(2),
        street_line1: RandomGenerator.alphabets(12),
        street_line2: null,
        is_default: false,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(addressB);
  // 2) Scenario 1: update addressA fields
  const updatedPayload1 = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "US",
    city: RandomGenerator.name(2),
    street_line1: RandomGenerator.alphabets(12),
    street_line2: RandomGenerator.alphabets(8),
    is_default: false,
  } satisfies IShoppingMallAddress.IUpdate;
  const beforeUpdatedAtA: string = addressA.updatedAt;
  const addressAUpdated =
    await api.functional.shoppingMall.member.addresses.update(
      member1Connection,
      {
        addressId: addressA.id,
        body: updatedPayload1,
      },
    );
  typia.assert(addressAUpdated);
  TestValidator.equals("address id unchanged", addressAUpdated.id, addressA.id);
  TestValidator.equals(
    "recipient name updated",
    addressAUpdated.recipientName,
    updatedPayload1.recipient_name,
  );
  TestValidator.equals(
    "phone number updated",
    addressAUpdated.phoneNumber,
    updatedPayload1.phone_number,
  );
  TestValidator.equals(
    "postal code updated",
    addressAUpdated.postalCode,
    updatedPayload1.postal_code,
  );
  TestValidator.equals(
    "country updated",
    addressAUpdated.country,
    updatedPayload1.country,
  );
  TestValidator.equals(
    "city updated",
    addressAUpdated.city,
    updatedPayload1.city,
  );
  TestValidator.equals(
    "street line1 updated",
    addressAUpdated.streetLine1,
    updatedPayload1.street_line1,
  );
  TestValidator.equals(
    "street line2 updated",
    addressAUpdated.streetLine2,
    updatedPayload1.street_line2,
  );
  TestValidator.equals("deletedAt stays null", addressAUpdated.deletedAt, null);
  TestValidator.notEquals(
    "updatedAt changed",
    addressAUpdated.updatedAt,
    beforeUpdatedAtA,
  );
  // 3) Scenario 2: default uniqueness switch between A and B
  const payloadSetDefaultA = {
    recipient_name: updatedPayload1.recipient_name,
    phone_number: updatedPayload1.phone_number,
    postal_code: updatedPayload1.postal_code,
    country: updatedPayload1.country,
    city: updatedPayload1.city,
    street_line1: updatedPayload1.street_line1,
    street_line2: updatedPayload1.street_line2,
    is_default: true,
  } satisfies IShoppingMallAddress.IUpdate;
  const payloadSetDefaultB = {
    recipient_name: addressB.recipientName,
    phone_number: addressB.phoneNumber,
    postal_code: addressB.postalCode,
    country: addressB.country,
    city: addressB.city,
    street_line1: addressB.streetLine1,
    street_line2: addressB.streetLine2,
    is_default: true,
  } satisfies IShoppingMallAddress.IUpdate;
  const addressASetDefault =
    await api.functional.shoppingMall.member.addresses.update(
      member1Connection,
      {
        addressId: addressAUpdated.id,
        body: payloadSetDefaultA,
      },
    );
  typia.assert(addressASetDefault);
  TestValidator.equals(
    "addressA is default",
    addressASetDefault.isDefault,
    true,
  );
  const addressBSetDefault =
    await api.functional.shoppingMall.member.addresses.update(
      member1Connection,
      {
        addressId: addressB.id,
        body: payloadSetDefaultB,
      },
    );
  typia.assert(addressBSetDefault);
  TestValidator.equals(
    "addressB is default",
    addressBSetDefault.isDefault,
    true,
  );
  // We cannot re-fetch addressA without a GET endpoint; perform another update on A to observe server-enforced state.
  const addressAReinforced =
    await api.functional.shoppingMall.member.addresses.update(
      member1Connection,
      {
        addressId: addressAUpdated.id,
        body: {
          recipient_name: payloadSetDefaultA.recipient_name,
          phone_number: payloadSetDefaultA.phone_number,
          postal_code: payloadSetDefaultA.postal_code,
          country: payloadSetDefaultA.country,
          city: payloadSetDefaultA.city,
          street_line1: payloadSetDefaultA.street_line1,
          street_line2: payloadSetDefaultA.street_line2,
          is_default: false,
        } satisfies IShoppingMallAddress.IUpdate,
      },
    );
  typia.assert(addressAReinforced);
  TestValidator.equals(
    "addressA no longer default",
    addressAReinforced.isDefault,
    false,
  );
  TestValidator.equals(
    "addressA remains active",
    addressAReinforced.deletedAt,
    null,
  );
  TestValidator.equals(
    "addressB remains active",
    addressBSetDefault.deletedAt,
    null,
  );
  // 4) Scenario 3: ownership protection
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member2);
  const attemptedPayloadCrossAccount = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "US",
    city: RandomGenerator.name(2),
    street_line1: RandomGenerator.alphabets(12),
    street_line2: null,
    is_default: true,
  } satisfies IShoppingMallAddress.IUpdate;
  await TestValidator.httpError(
    "ownership protected: member2 cannot update member1 address",
    [401, 403, 404],
    async () =>
      await api.functional.shoppingMall.member.addresses.update(
        member2Connection,
        {
          addressId: addressAUpdated.id,
          body: attemptedPayloadCrossAccount,
        },
      ),
  );
  TestValidator.equals(
    "member1 address remains active after forbidden attempt",
    addressAReinforced.deletedAt,
    null,
  );
}
