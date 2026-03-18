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

export async function test_api_shipping_address_delete_removes_from_selection(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Create a new shipping address
  const createdAddress =
    await generate_random_shopping_mall_member_addresses_create(
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
          is_default: true,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(createdAddress);
  const addressId = createdAddress.id;
  // 3) Delete the address
  await api.functional.shoppingMall.member.addresses.erase(memberConnection, {
    addressId,
  });
  // 4) Verify address is removed
  await TestValidator.error(
    "deleted address should not be retrievable",
    async () => {
      await api.functional.shoppingMall.member.addresses.at(memberConnection, {
        addressId,
      });
    },
  );
  // 5) Verify default selection behavior
  const defaultAfter =
    await api.functional.shoppingMall.member.addresses._default.at(
      memberConnection,
    );
  typia.assert(defaultAfter);
  TestValidator.notEquals(
    "default address should not be the deleted one",
    defaultAfter.id,
    addressId,
  );
}
