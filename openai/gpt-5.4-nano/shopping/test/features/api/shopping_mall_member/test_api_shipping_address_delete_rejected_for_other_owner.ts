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

export async function test_api_shipping_address_delete_rejected_for_other_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A join + authenticated connection
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // 2) Member B join + authenticated connection
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  TestValidator.notEquals(
    "member A and member B ids differ",
    memberA.id,
    memberB.id,
  );
  // 3) Member A creates a shipping address
  const memberAAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberAConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          postal_code: RandomGenerator.alphabets(6),
          country: RandomGenerator.name(1),
          city: RandomGenerator.name(1),
          street_line1: RandomGenerator.alphabets(12),
          street_line2: null,
          is_default: false,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(memberAAddress);
  // 4) Member B attempts to delete Member A's address
  await TestValidator.error(
    "cross-account delete should be rejected",
    async () => {
      await api.functional.shoppingMall.member.addresses.erase(
        memberBConnection,
        {
          addressId: memberAAddress.id,
        },
      );
    },
  );
  // 5) Ensure the address still exists for Member A
  const fetched = await api.functional.shoppingMall.member.addresses.at(
    memberAConnection,
    {
      addressId: memberAAddress.id,
    },
  );
  typia.assert(fetched);
  TestValidator.equals(
    "fetched address id unchanged",
    fetched.id,
    memberAAddress.id,
  );
  TestValidator.equals(
    "recipient name unchanged",
    fetched.recipientName,
    memberAAddress.recipientName,
  );
  TestValidator.equals(
    "phone number unchanged",
    fetched.phoneNumber,
    memberAAddress.phoneNumber,
  );
}
