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

export async function test_api_addresses_default_switching_single_default_rule(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join a member (authenticated actor connection)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2) Create two addresses (A and B) for the authenticated member
  const addressA = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: RandomGenerator.alphabets(5),
        country: RandomGenerator.name(1),
        city: RandomGenerator.name(1),
        street_line1: RandomGenerator.alphabets(10),
        street_line2: null,
        is_default: false,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(addressA);
  const addressB = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: RandomGenerator.alphabets(5),
        country: RandomGenerator.name(1),
        city: RandomGenerator.name(1),
        street_line1: RandomGenerator.alphabets(10),
        street_line2: null,
        is_default: false,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(addressB);
  // 3) Set A as default and verify via GET /default
  const defaultAfterSetA =
    await api.functional.shoppingMall.member.addresses._default.setDefaultAddress(
      memberConnection,
      {
        body: { id: addressA.id } satisfies IShoppingMallAddress.ISetDefault,
      },
    );
  typia.assert(defaultAfterSetA);
  const defaultAt1 =
    await api.functional.shoppingMall.member.addresses._default.at(
      memberConnection,
    );
  typia.assert(defaultAt1);
  TestValidator.equals("default after set A id", defaultAt1.id, addressA.id);
  TestValidator.equals(
    "default after set A isDefault",
    defaultAt1.isDefault,
    true,
  );
  // 4) Set B as default
  const defaultAfterSetB =
    await api.functional.shoppingMall.member.addresses._default.setDefaultAddress(
      memberConnection,
      {
        body: { id: addressB.id } satisfies IShoppingMallAddress.ISetDefault,
      },
    );
  typia.assert(defaultAfterSetB);
  // 5) Verify via GET /default again
  const defaultAt2 =
    await api.functional.shoppingMall.member.addresses._default.at(
      memberConnection,
    );
  typia.assert(defaultAt2);
  TestValidator.notEquals(
    "default after set B id differs from A",
    defaultAt2.id,
    addressA.id,
  );
  TestValidator.equals("default after set B is B", defaultAt2.id, addressB.id);
  TestValidator.equals(
    "default after set B isDefault",
    defaultAt2.isDefault,
    true,
  );
}
