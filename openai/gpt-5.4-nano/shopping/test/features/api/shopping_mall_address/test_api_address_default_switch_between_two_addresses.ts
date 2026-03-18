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

export async function test_api_address_default_switch_between_two_addresses(
  connection: api.IConnection,
): Promise<void> {
  // 1) member join + auth
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(authorized);
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    Authorization: authorized.token.access,
  };

  // 2) create two addresses for same member
  const firstPayload = await prepare_random_shopping_mall_address();
  const first = await generate_random_shopping_mall_member_addresses_create(
    authConnection,
    {
      body: {
        ...firstPayload,
        is_default: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(first);

  const secondPayload = await prepare_random_shopping_mall_address();
  const second = await generate_random_shopping_mall_member_addresses_create(
    authConnection,
    {
      body: {
        ...secondPayload,
        is_default: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(second);

  TestValidator.notEquals("address ids should differ", first.id, second.id);

  // 3) set default to second
  const updatedDefault =
    await api.functional.shoppingMall.member.addresses._default.setDefaultAddress(
      authConnection,
      {
        body: {
          id: second.id,
        } satisfies IShoppingMallAddress.ISetDefault,
      },
    );
  typia.assert(updatedDefault);

  // 4) validate response indicates second is default and active
  TestValidator.equals("default id should be second", updatedDefault.id, second.id);
  TestValidator.equals("default flag should be true", updatedDefault.is_default, true);
  TestValidator.equals(
    "deleted_at should be null (active)",
    updatedDefault.deleted_at,
    null,
  );

  // 5) re-validate by flipping default back to first
  const flippedToFirst =
    await api.functional.shoppingMall.member.addresses._default.setDefaultAddress(
      authConnection,
      {
        body: {
          id: first.id,
        } satisfies IShoppingMallAddress.ISetDefault,
      },
    );
  typia.assert(flippedToFirst);

  TestValidator.equals("after flip, default id should be first", flippedToFirst.id, first.id);
  TestValidator.equals("after flip, default flag should be true", flippedToFirst.is_default, true);
  TestValidator.equals(
    "deleted_at should be null (active)",
    flippedToFirst.deleted_at,
    null,
  );

  // 6) ensure second can be set back to default (single-default toggle behavior)
  const setSecondAgain =
    await api.functional.shoppingMall.member.addresses._default.setDefaultAddress(
      authConnection,
      {
        body: {
          id: second.id,
        } satisfies IShoppingMallAddress.ISetDefault,
      },
    );
  typia.assert(setSecondAgain);

  TestValidator.equals("second becomes default again", setSecondAgain.id, second.id);
  TestValidator.equals(
    "second default flag should be true",
    setSecondAgain.is_default,
    true,
  );
  TestValidator.equals(
    "deleted_at should be null (active)",
    setSecondAgain.deleted_at,
    null,
  );
}
