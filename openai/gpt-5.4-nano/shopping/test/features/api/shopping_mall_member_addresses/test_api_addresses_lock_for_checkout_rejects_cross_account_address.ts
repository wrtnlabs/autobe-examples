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

export async function test_api_addresses_lock_for_checkout_rejects_cross_account_address(
  connection: api.IConnection,
): Promise<void> {
  // 1) Auth as member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IShoppingMallMember.IAuthorized = await authorize_member_join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallMember.IJoin,
    },
  );
  typia.assert(memberA);
  // 2) Create an address for member A
  const memberAAddress: IShoppingMallAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberAConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          postal_code: RandomGenerator.alphabets(5),
          country: RandomGenerator.name(1),
          city: RandomGenerator.name(2),
          street_line1: RandomGenerator.paragraph({ sentences: 1 }),
          street_line2: null,
          is_default: true,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(memberAAddress);
  // 3) Auth as member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IShoppingMallMember.IAuthorized = await authorize_member_join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallMember.IJoin,
    },
  );
  typia.assert(memberB);
  // 4) Attempt to lock member A's address using member B session
  await TestValidator.httpError(
    "reject cross-account address locking",
    [400, 403, 404],
    async () =>
      await api.functional.shoppingMall.member.addresses.lock_for_checkout.lockForCheckout(
        memberBConnection,
        {
          addressId: memberAAddress.id,
        },
      ),
  );
}
