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

export async function test_api_addresses_lock_for_checkout_rejects_soft_deleted_address(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password,
    },
  });
  typia.assert(memberAuth);
  // 2) Create a shipping address
  const address = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: randint(10000, 99999).toString(),
        country: RandomGenerator.pick(["Korea", "Japan", "United States"]),
        city: RandomGenerator.name(),
        street_line1: RandomGenerator.paragraph({ sentences: 1 }),
        street_line2: null,
        is_default: false,
      },
    },
  );
  typia.assert(address);
  const addressId = address.id;
  // 3) Delete the address so it becomes ineligible
  await api.functional.shoppingMall.member.addresses.erase(memberConnection, {
    addressId,
  });
  // 4) Attempt to lock the deleted address for checkout
  await TestValidator.error(
    "lock-for-checkout should reject ineligible (deleted) address",
    async () => {
      await api.functional.shoppingMall.member.addresses.lock_for_checkout.lockForCheckout(
        memberConnection,
        {
          addressId,
        },
      );
    },
  );
}
