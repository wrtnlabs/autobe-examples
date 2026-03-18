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

export async function test_api_address_update_rejects_cross_account(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register Member 1
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" satisfies string & tags.Format<"password">,
    },
  });
  // 2) Member 1 creates one shipping address
  const addressBefore =
    await generate_random_shopping_mall_member_addresses_create(
      member1Connection,
      {},
    );
  typia.assert(addressBefore);
  const addressId = addressBefore.id;
  const beforeRecipientName = addressBefore.recipientName;
  const beforePhoneNumber = addressBefore.phoneNumber;
  const beforePostalCode = addressBefore.postalCode;
  const beforeCountry = addressBefore.country;
  const beforeCity = addressBefore.city;
  const beforeStreetLine1 = addressBefore.streetLine1;
  const beforeStreetLine2 = addressBefore.streetLine2;
  const beforeIsDefault = addressBefore.isDefault;
  // 3) Register Member 2
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" satisfies string & tags.Format<"password">,
    },
  });
  // 4) Member 2 attempts PATCH /addresses (ownership protection should reject)
  const attemptedUpdateBody = prepare_random_shopping_mall_address(
    {},
  ) satisfies IShoppingMallAddress.ICreate;
  await TestValidator.error(
    "cross-account address update must be rejected",
    async () => {
      await generate_random_shopping_mall_member_addresses_update_addresses(
        member2Connection,
        {
          body: attemptedUpdateBody,
        },
      );
    },
  );
  // 5) Verify Member 1 address remains unchanged
  const addressAfterByMember1 =
    await api.functional.shoppingMall.member.addresses.at(member1Connection, {
      addressId,
    });
  typia.assert(addressAfterByMember1);
  TestValidator.equals(
    "recipient name unchanged",
    addressAfterByMember1.recipientName,
    beforeRecipientName,
  );
  TestValidator.equals(
    "phone number unchanged",
    addressAfterByMember1.phoneNumber,
    beforePhoneNumber,
  );
  TestValidator.equals(
    "postal code unchanged",
    addressAfterByMember1.postalCode,
    beforePostalCode,
  );
  TestValidator.equals(
    "country unchanged",
    addressAfterByMember1.country,
    beforeCountry,
  );
  TestValidator.equals(
    "city unchanged",
    addressAfterByMember1.city,
    beforeCity,
  );
  TestValidator.equals(
    "street line1 unchanged",
    addressAfterByMember1.streetLine1,
    beforeStreetLine1,
  );
  TestValidator.equals(
    "street line2 unchanged",
    addressAfterByMember1.streetLine2,
    beforeStreetLine2,
  );
  TestValidator.equals(
    "isDefault unchanged",
    addressAfterByMember1.isDefault,
    beforeIsDefault,
  );
  // 6) Verify Member 2 cannot access that address
  await TestValidator.error(
    "cross-account address read must not be allowed",
    async () => {
      await api.functional.shoppingMall.member.addresses.at(member2Connection, {
        addressId,
      });
    },
  );
}
